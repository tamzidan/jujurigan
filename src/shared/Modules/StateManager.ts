import { Teams, Workspace } from "@rbxts/services";

const BARAYA_NORMAL_SPEED = 16;
const BARAYA_SPRINT_SPEED = 24; // Kecepatan saat lari cepat
const BARAYA_CROUCH_SPEED = 8; // Kecepatan lambat saat jongkok
const BARAYA_KNOCK_SPEED = 4;

export namespace StateManager {
	export function SetState(player: Player, newState: string) {
		player.SetAttribute("HealthState", newState);
		print(`${player.Name} sekarang berstatus: ${newState}`);

		const character = player.Character;
		if (character && character.FindFirstChild("Humanoid")) {
			const humanoid = character.FindFirstChild("Humanoid") as Humanoid;

			if (newState === "Healthy" || newState === "Injured") {
				// Atur kecepatan berdasarkan apakah pemain sedang sprint atau jongkok
				if (player.GetAttribute("IsSprinting")) {
					humanoid.WalkSpeed = BARAYA_SPRINT_SPEED;
				} else if (player.GetAttribute("IsCrouching")) {
					humanoid.WalkSpeed = BARAYA_CROUCH_SPEED;
				} else {
					humanoid.WalkSpeed = BARAYA_NORMAL_SPEED;
				}

				// MENGHILANGKAN MEKANIK LOMPAT
				humanoid.JumpPower = 0;
			} else if (newState === "Knock") {
				// Reset status pergerakan saat pemain terjatuh/knock
				player.SetAttribute("IsSprinting", false);
				player.SetAttribute("IsCrouching", false);

				humanoid.WalkSpeed = BARAYA_KNOCK_SPEED;
				humanoid.JumpPower = 0;
			} else if (newState === "Carried" || newState === "Hooked") {
				humanoid.WalkSpeed = 0;
				humanoid.JumpPower = 0;
			} else if (newState === "Dead" || newState === "Escaped") {
				if (Teams.FindFirstChild("Arwah")) {
					player.Team = Teams.FindFirstChild("Arwah") as Team;
				}

				if (newState === "Dead") {
					humanoid.Health = 0;
				} else if (newState === "Escaped") {
					const spawnCFrame = Workspace.FindFirstChild("SpawnLocationArwah") as Part | undefined;
					if (spawnCFrame) {
						character.PivotTo(spawnCFrame.CFrame.add(new Vector3(0, 3, 0)));
					}
				}
			}
		}
	}

	export function GetState(player: Player): string {
		return (player.GetAttribute("HealthState") as string) || "Healthy";
	}

	// FUNGSI BARU: Mengatur Sprint
	export function SetSprint(player: Player, isSprinting: boolean) {
		const state = GetState(player);
		// Pemain hanya bisa lari jika statusnya sehat atau cedera
		if (state === "Healthy" || state === "Injured") {
			player.SetAttribute("IsSprinting", isSprinting);

			if (isSprinting) {
				player.SetAttribute("IsCrouching", false); // Batalkan jongkok jika mulai lari
			}

			// Panggil ulang SetState untuk menerapkan kecepatan baru pada Humanoid
			SetState(player, state);
		}
	}

	// FUNGSI BARU: Mengatur Jongkok
	export function SetCrouch(player: Player, isCrouching: boolean) {
		const state = GetState(player);
		// Pemain hanya bisa jongkok jika statusnya sehat atau cedera
		if (state === "Healthy" || state === "Injured") {
			player.SetAttribute("IsCrouching", isCrouching);

			if (isCrouching) {
				player.SetAttribute("IsSprinting", false); // Batalkan lari jika mulai jongkok
			}

			// Panggil ulang SetState untuk menerapkan kecepatan baru pada Humanoid
			SetState(player, state);
		}
	}

	// FUNGSI LAMA: Efek Stun untuk Jurig
	export function StunJurig(player: Player, duration: number) {
		const character = player.Character;
		if (character && character.FindFirstChild("Humanoid")) {
			// Cek agar tidak di-stun ganda
			if (player.GetAttribute("IsStunned")) return;

			print(">>> JURIG TERKENA STUN! <<<");
			player.SetAttribute("IsStunned", true);

			const humanoid = character.FindFirstChild("Humanoid") as Humanoid;
			const originalSpeed = humanoid.WalkSpeed;

			// Bekukan Jurig
			humanoid.WalkSpeed = 0;
			humanoid.JumpPower = 0;

			// Tunggu durasi stun (misal: 3 detik)
			task.delay(duration, () => {
				// Kembalikan kecepatan setelah stun selesai
				if (player && player.Character && player.GetAttribute("IsStunned")) {
					const currentHumanoid = player.Character.FindFirstChild("Humanoid") as Humanoid | undefined;
					if (currentHumanoid) {
						currentHumanoid.WalkSpeed = originalSpeed;
						currentHumanoid.JumpPower = 0;
					}
					player.SetAttribute("IsStunned", false);
					print("Jurig pulih dari stun.");
				}
			});
		}
	}
}