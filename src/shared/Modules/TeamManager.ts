import { Players, Teams } from "@rbxts/services";

export namespace TeamManager {
	// Fungsi untuk memberikan JurigChance awal saat pemain baru join game
	export function SetupPlayer(player: Player) {
		if (player.GetAttribute("JurigChance") === undefined) {
			player.SetAttribute("JurigChance", 0);
		}
	}

	// Fungsi utama untuk memilih 1 Jurig dan sisanya Baraya saat ronde dimulai
	export function AssignRodeTeams(): boolean {
		const allPlayers = Players.GetPlayers();

		// Jika pemain kurang dari 2, batalkan
		if (allPlayers.size() < 2) {
			warn("Pemain tidak cukup untuk memulai ronde!");
			return false;
		}

		let highestChance = -1;
		let selectedJurig: Player | undefined = undefined;

		// 1. Cari pemain dengan JurigChance paling tinggi
		for (const player of allPlayers) {
			const chance = (player.GetAttribute("JurigChance") as number) || 0;

			if (chance > highestChance) {
				highestChance = chance;
				selectedJurig = player;
			}
		}

		// 2. Pindahkan pemain ke tim masing-masing dan atur ulang Chance
		for (const player of allPlayers) {
			if (player === selectedJurig) {
				player.Team = Teams.FindFirstChild("Jurig") as Team;
				player.SetAttribute("JurigChance", 0);
				print(`${player.Name} terpilih sebagai Jurig!`);
			} else {
				player.Team = Teams.FindFirstChild("Baraya") as Team;
				const currentChance = (player.GetAttribute("JurigChance") as number) || 0;
				player.SetAttribute("JurigChance", currentChance + 1);
				print(`${player.Name} menjadi Baraya. Jurig Chance naik!`);
			}
		}

		return true;
	}

	// Fungsi untuk mengembalikan semua pemain ke tim Arwah (Lobby)
	export function ResetToLobby() {
		const allPlayers = Players.GetPlayers();
		for (const player of allPlayers) {
			player.Team = Teams.FindFirstChild("Arwah") as Team;
		}
		print("Semua pemain dikembalikan ke Arwah.");
	}
}