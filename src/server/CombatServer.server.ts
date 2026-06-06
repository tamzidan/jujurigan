import { ReplicatedStorage, Players, Workspace } from "@rbxts/services";
import { StateManager } from "../shared/Modules/StateManager";

const Shared = ReplicatedStorage.WaitForChild("TS") as Folder;
const Events = Shared.WaitForChild("Events") as Folder;
const RequestAction = Events.WaitForChild("RequestAction") as RemoteEvent;

const HIT_RANGE = 6;
const INTERACT_RANGE = 7;

RequestAction.OnServerEvent.Connect((player, action) => {
	const char = player.Character;
	if (!char) return;
	const rootPart = char.FindFirstChild("HumanoidRootPart") as Part | undefined;
	if (!rootPart) return;

	const myPos = rootPart.Position;

	// ---------------------------------------------------------
	// LOGIKA UNTUK TIM JURIG
	// ---------------------------------------------------------
	if (player.Team && player.Team.Name === "Jurig") {
		// AKSI 1: MEMUKUL (HIT)
		if (action === "Hit") {
			for (const targetPlayer of Players.GetPlayers()) {
				if (targetPlayer.Team && targetPlayer.Team.Name === "Baraya") {
					const targetChar = targetPlayer.Character;
					const targetRoot = targetChar?.FindFirstChild("HumanoidRootPart") as Part | undefined;

					if (targetRoot) {
						const distance = myPos.sub(targetRoot.Position).Magnitude;

						if (distance <= HIT_RANGE) {
							const currentState = StateManager.GetState(targetPlayer);
							if (currentState === "Healthy") {
								StateManager.SetState(targetPlayer, "Injured");
								break;
							} else if (currentState === "Injured") {
								StateManager.SetState(targetPlayer, "Knock");
								break;
							}
						}
					}
				}
			}

			// AKSI 2: MENGGENDONG & MENUMBALKAN (CARRY/HOOK)
		} else if (action === "Carry") {
			const existingWeld = char.FindFirstChild("CarryWeld") as WeldConstraint | undefined;

			// SKENARIO A: JURIG SEDANG MENGGENDONG (Coba Hook)
			if (existingWeld) {
				for (const item of Workspace.GetDescendants()) {
					if (item.Name === "TumbalHook" && item.IsA("BasePart")) {
						const distanceToHook = myPos.sub(item.Position).Magnitude;
						if (distanceToHook <= INTERACT_RANGE) {
							const targetTorso = existingWeld.Part1 as Part;
							const targetChar = targetTorso.Parent as Model;
							const targetPlayer = Players.GetPlayerFromCharacter(targetChar);

							if (targetPlayer) {
								// Hapus lem gendong
								existingWeld.Destroy();
								targetTorso.CFrame = item.CFrame.mul(new CFrame(0, 0, -1)).mul(
									CFrame.Angles(0, math.rad(180), 0),
								);

								// Hitung berapa kali Baraya ini sudah di-hook
								let currentHooks = (targetPlayer.GetAttribute("HookCount") as number) || 0;
								currentHooks += 1;
								targetPlayer.SetAttribute("HookCount", currentHooks);

								if (currentHooks >= 3) {
									// Mati sepenuhnya
									print(`${targetPlayer.Name} MATI DITUMBALKAN!`);
									StateManager.SetState(targetPlayer, "Dead");
								} else {
									// Masih hidup, gantung di tiang
									print(`${targetPlayer.Name} di-hook (Tahap ${currentHooks}/3)`);

									const hookWeld = new Instance("WeldConstraint");
									hookWeld.Name = "HookWeld";
									hookWeld.Part0 = item;
									hookWeld.Part1 = targetTorso;
									hookWeld.Parent = targetTorso; // Simpan di Baraya agar mudah dihapus nanti

									for (const part of targetChar.GetChildren()) {
										if (part.IsA("BasePart")) {
											part.Massless = false;
										}
									}

									StateManager.SetState(targetPlayer, "Hooked");
								}
							}
							break;
						}
					}
				}
				return;
			}

			// SKENARIO B: JURIG TIDAK MENGGENDONG (Coba Gendong)
			for (const targetPlayer of Players.GetPlayers()) {
				if (targetPlayer.Team && targetPlayer.Team.Name === "Baraya") {
					const targetChar = targetPlayer.Character;
					const targetRoot = targetChar?.FindFirstChild("HumanoidRootPart") as Part | undefined;

					if (targetRoot) {
						const distance = myPos.sub(targetRoot.Position).Magnitude;

						if (distance <= INTERACT_RANGE && StateManager.GetState(targetPlayer) === "Knock") {
							print(`${player.Name} menggendong ${targetPlayer.Name}`);
							StateManager.SetState(targetPlayer, "Carried");

							const jurigTorso = rootPart;
							const targetTorso = targetRoot;
							targetTorso.CFrame = jurigTorso.CFrame.mul(new CFrame(0, 2, 1)).mul(
								CFrame.Angles(math.rad(-90), 0, 0),
							);

							const weld = new Instance("WeldConstraint");
							weld.Name = "CarryWeld";
							weld.Part0 = jurigTorso;
							weld.Part1 = targetTorso;
							weld.Parent = char;

							for (const part of targetChar!.GetChildren()) {
								if (part.IsA("BasePart")) {
									part.Massless = true;
									part.CanCollide = false;
								}
							}
							break;
						}
					}
				}
			}
		}

		// ---------------------------------------------------------
		// LOGIKA UNTUK TIM BARAYA
		// ---------------------------------------------------------
	} else if (player.Team && player.Team.Name === "Baraya") {
		// AKSI: MENYELAMATKAN TEMAN (UNHOOK)
		if (action === "Carry") {
			const myState = StateManager.GetState(player);
			// Hanya Baraya yang Sehat atau Injured yang bisa menyelamatkan
			if (myState === "Healthy" || myState === "Injured") {
				for (const targetPlayer of Players.GetPlayers()) {
					if (targetPlayer !== player && targetPlayer.Team && targetPlayer.Team.Name === "Baraya") {
						const targetState = StateManager.GetState(targetPlayer);

						if (targetState === "Hooked") {
							const targetChar = targetPlayer.Character;
							const targetRoot = targetChar?.FindFirstChild("HumanoidRootPart") as Part | undefined;

							if (targetRoot) {
								const distance = myPos.sub(targetRoot.Position).Magnitude;

								if (distance <= INTERACT_RANGE) {
									print(`${player.Name} menyelamatkan ${targetPlayer.Name}!`);

									// Hancurkan lem (Weld) dari tiang
									const hookWeld = targetRoot.FindFirstChild("HookWeld");
									if (hookWeld) hookWeld.Destroy();

									// Kembalikan fisik dan posisikan sedikit ke depan agar tidak nyangkut
									targetChar!.PivotTo(targetRoot.CFrame.mul(new CFrame(0, 0, -3)));
									for (const part of targetChar!.GetChildren()) {
										if (part.IsA("BasePart")) {
											part.CanCollide = true;
										}
									}

									// Baraya yang diselamatkan masuk ke state Injured
									StateManager.SetState(targetPlayer, "Injured");
									break;
								}
							}
						}
					}
				}
			}
		}
	}
});