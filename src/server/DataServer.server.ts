import { Players, DataStoreService, HttpService, ReplicatedStorage } from "@rbxts/services";
import { CharacterData } from "../shared/GameData/CharacterData";

const Shared = ReplicatedStorage.WaitForChild("TS") as Folder;
const Events = Shared.WaitForChild("Events") as Folder;
const BuyRequest = Events.WaitForChild("BuyRequest") as RemoteEvent;
const EquipRequest = Events.WaitForChild("EquipRequest") as RemoteEvent;

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

const DefaultData: PlayerSessionData = {
	Level: 1,
	Uang: 0,
	OwnedJurig: ["JurigDefault"],
	EquippedJurig: "JurigDefault",
	BarayaPerks: [],
	JurigPerks: [],
	EquippedBarayaPerks: ["", "", ""],
	EquippedJurigPerks: ["", "", ""],
	EquippedItem: "",
};

const SessionData = new Map<string, PlayerSessionData>();

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
        
        // TAMBAHAN: Ekspor data kepemilikan agar bisa dibaca GUI Client
        player.SetAttribute("OwnedJurig", HttpService.JSONEncode(pData.OwnedJurig));
	} else {
		warn(`Gagal memuat data untuk ${player.Name}. Error: ${errorMessage}`);
		player.Kick("Gagal memuat data dari server. Silakan masuk kembali.");
	}
});

BuyRequest.OnServerEvent.Connect((player, itemType, itemId) => {
	const playerUserId = `Player_${player.UserId}`;
	const pData = SessionData.get(playerUserId);
	if (!pData) return;

	if (itemType === "Character") {
		const charInfo = CharacterData[itemId as string];
		if (charInfo) {
			if (pData.OwnedJurig.includes(itemId as string)) return;

			const uangVal = player.FindFirstChild("leaderstats")?.FindFirstChild("Uang") as IntValue;
			if (uangVal && uangVal.Value >= charInfo.Cost) {
				uangVal.Value -= charInfo.Cost;
				pData.Uang = uangVal.Value;

				pData.OwnedJurig.push(itemId as string);
                // TAMBAHAN: Sinkronisasi GUI Client saat barang dibeli
                player.SetAttribute("OwnedJurig", HttpService.JSONEncode(pData.OwnedJurig));
				print(`${player.Name} berhasil membeli ${charInfo.Name}!`);
			}
		}
	}
});

EquipRequest.OnServerEvent.Connect((player, itemType, itemId) => {
	const playerUserId = `Player_${player.UserId}`;
	const pData = SessionData.get(playerUserId);
	if (!pData) return;

	if (itemType === "Character") {
		if (pData.OwnedJurig.includes(itemId as string)) {
			pData.EquippedJurig = itemId as string;
			player.SetAttribute("EquippedJurig", itemId as string);
		}
	}
});

Players.PlayerRemoving.Connect((player) => {
	const playerUserId = `Player_${player.UserId}`;
	const pData = SessionData.get(playerUserId);

	if (pData) {
		const uangVal = player.FindFirstChild("leaderstats")?.FindFirstChild("Uang") as IntValue;
		const levelVal = player.FindFirstChild("leaderstats")?.FindFirstChild("Level") as IntValue;

		if (uangVal) pData.Uang = uangVal.Value;
		if (levelVal) pData.Level = levelVal.Value;

		pcall(() => PlayerDataStore.SetAsync(playerUserId, pData));
		SessionData.delete(playerUserId);
	}
});

game.BindToClose(() => {
	for (const player of Players.GetPlayers()) {
		const playerUserId = `Player_${player.UserId}`;
		const pData = SessionData.get(playerUserId);

		if (pData) {
			const uangVal = player.FindFirstChild("leaderstats")?.FindFirstChild("Uang") as IntValue;
			const levelVal = player.FindFirstChild("leaderstats")?.FindFirstChild("Level") as IntValue;

			if (uangVal) pData.Uang = uangVal.Value;
			if (levelVal) pData.Level = levelVal.Value;

			pcall(() => PlayerDataStore.SetAsync(playerUserId, pData));
		}
	}
	task.wait(2);
});