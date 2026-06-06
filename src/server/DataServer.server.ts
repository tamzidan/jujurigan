import { Players, DataStoreService, HttpService, ReplicatedStorage } from "@rbxts/services";
import { CharacterData } from "../shared/GameData/CharacterData";

const Shared = ReplicatedStorage.WaitForChild("TS") as Folder;
const Events = Shared.WaitForChild("Events") as Folder;
const BuyRequest = Events.WaitForChild("BuyRequest") as RemoteEvent;
const EquipRequest = Events.WaitForChild("EquipRequest") as RemoteEvent;

// Membuat/Mengakses brankas penyimpanan bernama "ViolenceDistrict_AlphaV1"
const PlayerDataStore = DataStoreService.GetDataStore("ViolenceDistrict_AlphaV1");

interface PlayerSessionData {
	Level: number;
	Uang: number;
	OwnedJurig: string[];
	EquippedJurig: string;
	BarayaPerks: string[];
	JurigPerks: string[];
	EquippedBarayaPerks: string[];
	EquippedJurigPerks: string[];
	EquippedItem: string;
}

// Struktur Data Bawaan (Bagi pemain yang baru pertama kali main)
const DefaultData: PlayerSessionData = {
	Level: 1,
	Uang: 0,
	OwnedJurig: ["JurigDefault"], // Semua orang punya karakter gratis ini
	EquippedJurig: "JurigDefault",
	BarayaPerks: [],
	JurigPerks: [],
	EquippedBarayaPerks: ["", "", ""],
	EquippedJurigPerks: ["", "", ""],
	EquippedItem: "",
};

// Tempat penampungan data sementara di Server
const SessionData = new Map<string, PlayerSessionData>();

// Fungsi memuat data saat pemain masuk
Players.PlayerAdded.Connect((player) => {
	const leaderstats = new Instance("Folder");
	leaderstats.Name = "leaderstats";
	leaderstats.Parent = player;

	const level = new Instance("IntValue");
	level.Name = "Level";
	level.Parent = leaderstats;

	const uang = new Instance("IntValue");
	uang.Name = "Uang";
	uang.Parent = leaderstats;

	const playerUserId = `Player_${player.UserId}`;
	let data: unknown;

	const [success, errorMessage] = pcall(() => {
		data = PlayerDataStore.GetAsync(playerUserId)[0];
	});

	if (success) {
		if (data) {
			SessionData.set(playerUserId, data as PlayerSessionData);
			print(`Data dimuat untuk: ${player.Name}`);
		} else {
			// Copy data default agar tidak referensi langsung
			const decoded = HttpService.JSONDecode(HttpService.JSONEncode(DefaultData)) as PlayerSessionData;
			SessionData.set(playerUserId, decoded);
			print(`Pemain baru! Membuat profil default untuk: ${player.Name}`);
		}

		const pData = SessionData.get(playerUserId)!;
		level.Value = pData.Level;
		uang.Value = pData.Uang;

		player.SetAttribute("EquippedJurig", pData.EquippedJurig);
		player.SetAttribute("EquippedBarayaPerks", HttpService.JSONEncode(pData.EquippedBarayaPerks));
		player.SetAttribute("EquippedJurigPerks", HttpService.JSONEncode(pData.EquippedJurigPerks));
	} else {
		warn(`Gagal memuat data untuk ${player.Name}. Error: ${errorMessage}`);
		player.Kick("Gagal memuat data dari server. Silakan masuk kembali.");
	}
});

// SISTEM PEMBELIAN (SHOP)
BuyRequest.OnServerEvent.Connect((player, itemType, itemId) => {
	const playerUserId = `Player_${player.UserId}`;
	const pData = SessionData.get(playerUserId);
	if (!pData) return;

	if (itemType === "Character") {
		const charInfo = CharacterData[itemId as string];
		if (charInfo) {
			// Cek apakah sudah punya?
			if (pData.OwnedJurig.includes(itemId as string)) {
				print(`${player.Name} sudah memiliki ${itemId}`);
				return;
			}

			const uangVal = player.FindFirstChild("leaderstats")?.FindFirstChild("Uang") as IntValue;
			// Cek uang cukup?
			if (uangVal && uangVal.Value >= charInfo.Cost) {
				// Potong uang
				uangVal.Value -= charInfo.Cost;
				pData.Uang = uangVal.Value;

				// Masukkan ke inventaris
				pData.OwnedJurig.push(itemId as string);
				print(`${player.Name} berhasil membeli ${charInfo.Name}!`);
			} else {
				print(`${player.Name} uangnya tidak cukup untuk ${charInfo.Name}`);
			}
		}
	}
});

// SISTEM PEMAKAIAN (LOADOUT)
EquipRequest.OnServerEvent.Connect((player, itemType, itemId) => {
	const playerUserId = `Player_${player.UserId}`;
	const pData = SessionData.get(playerUserId);
	if (!pData) return;

	if (itemType === "Character") {
		if (pData.OwnedJurig.includes(itemId as string)) {
			pData.EquippedJurig = itemId as string;
			player.SetAttribute("EquippedJurig", itemId as string);
			print(`${player.Name} sekarang menge-equip Jurig: ${itemId}`);
		} else {
			print(`${player.Name} mencoba equip ${itemId} tapi belum punya!`);
		}
	}
});

// Fungsi menyimpan data saat pemain keluar
Players.PlayerRemoving.Connect((player) => {
	const playerUserId = `Player_${player.UserId}`;
	const pData = SessionData.get(playerUserId);

	if (pData) {
		const uangVal = player.FindFirstChild("leaderstats")?.FindFirstChild("Uang") as IntValue;
		const levelVal = player.FindFirstChild("leaderstats")?.FindFirstChild("Level") as IntValue;

		if (uangVal) pData.Uang = uangVal.Value;
		if (levelVal) pData.Level = levelVal.Value;

		const [success, errorMessage] = pcall(() => {
			PlayerDataStore.SetAsync(playerUserId, pData);
		});

		if (success) {
			print(`Data berhasil disimpan untuk: ${player.Name}`);
		} else {
			warn(`Gagal menyimpan data untuk ${player.Name}. Error: ${errorMessage}`);
		}
		SessionData.delete(playerUserId);
	}
});

// Keamanan ekstra: Jika server mendadak dimatikan
game.BindToClose(() => {
	for (const player of Players.GetPlayers()) {
		const playerUserId = `Player_${player.UserId}`;
		const pData = SessionData.get(playerUserId);

		if (pData) {
			const uangVal = player.FindFirstChild("leaderstats")?.FindFirstChild("Uang") as IntValue;
			const levelVal = player.FindFirstChild("leaderstats")?.FindFirstChild("Level") as IntValue;

			if (uangVal) pData.Uang = uangVal.Value;
			if (levelVal) pData.Level = levelVal.Value;

			pcall(() => {
				PlayerDataStore.SetAsync(playerUserId, pData);
			});
		}
	}
	task.wait(2); // Beri waktu sedikit agar proses save selesai
});