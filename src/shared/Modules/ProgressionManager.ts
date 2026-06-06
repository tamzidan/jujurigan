import { Players } from "@rbxts/services";
import { StateManager } from "./StateManager";

export namespace ProgressionManager {
	// Fungsi untuk memberikan hadiah berdasarkan siapa yang menang
	export function RewardPlayers(winnerTeam: string) {
		for (const player of Players.GetPlayers()) {
			const leaderstats = player.FindFirstChild("leaderstats");
			if (!leaderstats) continue;

			const uang = leaderstats.FindFirstChild("Uang") as IntValue | undefined;
			if (!uang) continue;

			// Kalkulasi Hadiah
			if (winnerTeam === "Jurig" && player.Team && player.Team.Name === "Jurig") {
				uang.Value += 100;
				print(`${player.Name} mendapat +100 Uang karena menang sebagai Jurig!`);
			} else if (winnerTeam === "Baraya" && StateManager.GetState(player) === "Escaped") {
				uang.Value += 100;
				print(`${player.Name} mendapat +100 Uang karena berhasil kabur!`);
			} else {
				// Hadiah partisipasi untuk yang kalah atau mati (agar tidak frustrasi)
				uang.Value += 20;
				print(`${player.Name} mendapat +20 Uang partisipasi.`);
			}

			// (Nantinya di sini kita bisa tambahkan logika penambahan EXP/Level)
		}
	}
}