import { Teams, Players, Workspace, ServerStorage, StarterPlayer } from "@rbxts/services";
import { TeamManager } from "../shared/Modules/TeamManager";
import { StateManager } from "../shared/Modules/StateManager";
import { MapManager } from "../shared/Modules/MapManager";
import { ProgressionManager } from "../shared/Modules/ProgressionManager";

let GameState = "Waiting";
const MinPlayers = 2;
const IntermissionTime = 10;
const RoundTimeLimit = 15 * 60;
const JURIG_SPEED = 18;

function TeleportPlayers() {
	for (const player of Players.GetPlayers()) {
		const character = player.Character;
		if (character && character.FindFirstChild("HumanoidRootPart")) {
			if (player.Team === Teams.FindFirstChild("Jurig")) {
				const spawnPoint = Workspace.FindFirstChild("SpawnLocationJurig") as Part;
				character.PivotTo(spawnPoint.CFrame.add(new Vector3(0, 3, 0)));
			} else if (player.Team === Teams.FindFirstChild("Baraya")) {
				const spawnPoint = Workspace.FindFirstChild("SpawnLocationBaraya") as Part;
				character.PivotTo(spawnPoint.CFrame.add(new Vector3(0, 3, 0)));
			} else {
				const spawnPoint = Workspace.FindFirstChild("SpawnLocationArwah") as Part;
				character.PivotTo(spawnPoint.CFrame.add(new Vector3(0, 3, 0)));
			}
		}
	}
}

Players.PlayerAdded.Connect((player) => {
	print(`${player.Name} bergabung ke game.`);
	TeamManager.SetupPlayer(player);

	if (Teams.FindFirstChild("Arwah")) {
		player.Team = Teams.FindFirstChild("Arwah") as Team;

		// Hanya teleport ke Arwah saat respawn biasa.
		player.CharacterAdded.Connect((character) => {
			task.wait(0.1);
			if (player.Team === Teams.FindFirstChild("Arwah")) {
				const spawnLocation = Workspace.FindFirstChild("SpawnLocationArwah") as Part | undefined;
				if (spawnLocation) {
					character.PivotTo(spawnLocation.CFrame.add(new Vector3(0, 3, 0)));
				}

				// Paksa reset kamera agar tidak jebol ke FPV saat respawn normal di Lobby
				player.CameraMode = Enum.CameraMode.Classic;
				player.CameraMinZoomDistance = 10;
				player.CameraMaxZoomDistance = 50;
			}
		});
	} else {
		warn("Tim 'Arwah' belum dibuat di folder Teams!");
	}
});

function StartGameLoop() {
	while (true) {
		GameState = "Waiting";
		print("--- MENUNGGU PEMAIN ---");

		while (Players.GetPlayers().size() < MinPlayers) {
			task.wait(1);
		}

		GameState = "Starting";
		print(`Pemain cukup! Ronde akan dimulai dalam ${IntermissionTime} detik...`);
		task.wait(IntermissionTime);

		if (Players.GetPlayers().size() >= MinPlayers) {
			GameState = "InGame";
			print("--- RONDE DIMULAI ---");

			const mapLoaded = MapManager.LoadRandomMap();
			if (!mapLoaded) {
				warn("Gagal memuat map. Ronde dibatalkan.");
				continue;
			}

			const success = TeamManager.AssignRodeTeams();

			if (success) {
				print("Menyiapkan karakter dan menteleportasi pemain ke arena...");

				// =========================================
				// PENYIAPAN KARAKTER (BARAYA & JURIG)
				// =========================================
				for (const player of Players.GetPlayers()) {
					if (player.Team === Teams.FindFirstChild("Jurig")) {
						let equippedJurig = player.GetAttribute("EquippedJurig") as string;
						if (!equippedJurig || equippedJurig === "") {
							equippedJurig = "JurigDefault";
						}

						const jurigModels = ServerStorage.FindFirstChild("JurigModels") as Folder | undefined;
						const jurigModelPrefab = jurigModels?.FindFirstChild(equippedJurig) as Model | undefined;

						if (jurigModelPrefab) {
							// Bersihkan sisa jika ada error di ronde sebelumnya
							const oldStarter = StarterPlayer.FindFirstChild("StarterCharacter");
							if (oldStarter) oldStarter.Destroy();

							// TRIK MORPHING PALING AMAN: Gunakan StarterCharacter Sementara
							const tempStarter = jurigModelPrefab.Clone();
							tempStarter.Name = "StarterCharacter";
							tempStarter.Parent = StarterPlayer;

							// Paksa pemain respawn menggunakan rig Jurig.
							pcall(() => player.LoadCharacter());

							// Paksa kamera FPV dari Server untuk menimpa bug reset bawaan
							player.CameraMode = Enum.CameraMode.LockFirstPerson;
							player.CameraMinZoomDistance = 0.5;
							player.CameraMaxZoomDistance = 0.5;

							// Langsung hapus agar tidak terpakai oleh pemain lain
							tempStarter.Destroy();
						} else {
							warn(`Model Jurig tidak ditemukan di ServerStorage/JurigModels untuk: ${equippedJurig}`);
							pcall(() => player.LoadCharacter());
						}
					} else if (player.Team === Teams.FindFirstChild("Baraya")) {
						// Pastikan Baraya menggunakan avatar asli dengan darah penuh
						pcall(() => player.LoadCharacter());

						// Aturan Kamera Baraya (Third Person terbatas)
						player.CameraMode = Enum.CameraMode.Classic;
						player.CameraMinZoomDistance = 5;
						player.CameraMaxZoomDistance = 12;
					}
				}

				// JEDA: Tunggu engine Roblox menyelesaikan proses spawn dan physics (Wajib)
				task.wait(1.5);

				// Baru pindahkan SEMUA pemain ke arena
				TeleportPlayers();

				// Set Speed & JumpPower setelah karakter benar-benar siap di arena
				for (const player of Players.GetPlayers()) {
					if (player.Team === Teams.FindFirstChild("Jurig")) {
						const char = player.Character;
						const humanoid = char?.FindFirstChild("Humanoid") as Humanoid | undefined;
						if (humanoid) {
							humanoid.WalkSpeed = JURIG_SPEED;
							humanoid.JumpPower = 0;
						}
					} else if (player.Team === Teams.FindFirstChild("Baraya")) {
						StateManager.SetState(player, "Healthy");
					}
				}

				let TimeLeft = RoundTimeLimit;
				let Winner = "None";

				while (TimeLeft > 0 && GameState === "InGame") {
					let barayaCount = 0;
					let barayaEscapedCount = 0;

					for (const p of Players.GetPlayers()) {
						if (p.Team === Teams.FindFirstChild("Baraya")) {
							barayaCount += 1;
						}
						if (StateManager.GetState(p) === "Escaped") {
							barayaEscapedCount += 1;
						}
					}

					if (barayaCount === 0) {
						if (barayaEscapedCount > 0) {
							Winner = "Baraya";
						} else {
							Winner = "Jurig";
						}
						break;
					}

					task.wait(1);
					TimeLeft -= 1;
				}

				GameState = "Ending";
				print("--- RONDE SELESAI ---");

				if (Winner === "Jurig" || (Winner === "None" && TimeLeft <= 0)) {
					print(">>> JURIG MENANG! Semua Baraya Tumbang / Waktu Habis <<<");
					ProgressionManager.RewardPlayers("Jurig");
				} else if (Winner === "Baraya") {
					print(">>> BARAYA MENANG! Mereka Berhasil Kabur! <<<");
					ProgressionManager.RewardPlayers("Baraya");
				}

				task.wait(4);

				// 1. Kembalikan Team ke Arwah
				TeamManager.ResetToLobby();

				// Berikan jeda agar UI dan CameraController Client sadar bahwa game sudah usai
				task.wait(1.5);

				// 2. Mengembalikan avatar asli pemain saat kembali ke Lobby
				for (const player of Players.GetPlayers()) {
					player.SetAttribute("HealthState", undefined);
					task.spawn(() => {
						// Karena StarterCharacter tadi sudah dihapus, ini akan memuat avatar asli pemain!
						pcall(() => player.LoadCharacter());

						// PERBAIKAN BUG KAMERA: Paksa kamera ke setelan Lobby sesudah LoadCharacter
						player.CameraMode = Enum.CameraMode.Classic;
						player.CameraMinZoomDistance = 10;
						player.CameraMaxZoomDistance = 50;
					});
				}

				MapManager.ClearMap();

				task.wait(3);
			}
		} else {
			print("Pemain tidak cukup setelah hitung mundur, dibatalkan.");
		}
	}
}

task.spawn(StartGameLoop);