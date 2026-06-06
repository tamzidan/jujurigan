import { Players, ReplicatedStorage } from "@rbxts/services";

const player = Players.LocalPlayer;
const PlayerGui = player.WaitForChild("PlayerGui") as PlayerGui;

const Shared = ReplicatedStorage.WaitForChild("TS") as Folder;
const Events = Shared.WaitForChild("Events") as Folder;
const BuyRequest = Events.WaitForChild("BuyRequest") as RemoteEvent;
const EquipRequest = Events.WaitForChild("EquipRequest") as RemoteEvent;

// 1. Membuat Layar UI Lobby Sederhana (Hanya muncul saat di Lobby)
const screenGui = new Instance("ScreenGui");
screenGui.Name = "ViolenceDistrictLobbyUI";
screenGui.ResetOnSpawn = false;
screenGui.Parent = PlayerGui;

const mainFrame = new Instance("Frame");
mainFrame.Size = new UDim2(0, 300, 0, 200);
mainFrame.Position = new UDim2(0.05, 0, 0.5, -100); // Kiri tengah
mainFrame.BackgroundColor3 = Color3.fromRGB(30, 30, 30);
mainFrame.BackgroundTransparency = 0.2;
mainFrame.Parent = screenGui;
new Instance("UICorner").Parent = mainFrame;

const title = new Instance("TextLabel");
title.Size = new UDim2(1, 0, 0, 40);
title.Text = "Toko & Loadout Jurig";
title.TextColor3 = Color3.fromRGB(255, 255, 255);
title.Font = Enum.Font.GothamBold;
title.TextSize = 20;
title.BackgroundTransparency = 1;
title.Parent = mainFrame;

// Tombol Beli Pocong
const buyPocongBtn = new Instance("TextButton");
buyPocongBtn.Size = new UDim2(0.8, 0, 0, 40);
buyPocongBtn.Position = new UDim2(0.1, 0, 0.3, 0);
buyPocongBtn.Text = "Beli Pocong (2000 Uang)";
buyPocongBtn.BackgroundColor3 = Color3.fromRGB(40, 150, 60);
buyPocongBtn.TextColor3 = Color3.fromRGB(255, 255, 255);
buyPocongBtn.Font = Enum.Font.GothamBold;
buyPocongBtn.Parent = mainFrame;
new Instance("UICorner").Parent = buyPocongBtn;

// Tombol Equip Pocong
const equipPocongBtn = new Instance("TextButton");
equipPocongBtn.Size = new UDim2(0.8, 0, 0, 40);
equipPocongBtn.Position = new UDim2(0.1, 0, 0.6, 0);
equipPocongBtn.Text = "Pakai Pocong";
equipPocongBtn.BackgroundColor3 = Color3.fromRGB(40, 80, 150);
equipPocongBtn.TextColor3 = Color3.fromRGB(255, 255, 255);
equipPocongBtn.Font = Enum.Font.GothamBold;
equipPocongBtn.Parent = mainFrame;
new Instance("UICorner").Parent = equipPocongBtn;

// 2. Fungsi Klik Tombol
buyPocongBtn.MouseButton1Click.Connect(() => {
	print("Mencoba membeli Pocong...");
	BuyRequest.FireServer("Character", "Pocong");
});

equipPocongBtn.MouseButton1Click.Connect(() => {
	print("Mencoba memakai Pocong...");
	EquipRequest.FireServer("Character", "Pocong");
});

// Sembunyikan UI ini jika pemain sedang di dalam arena (Ronde Dimulai)
player.GetPropertyChangedSignal("Team").Connect(() => {
	if (player.Team && player.Team.Name === "Arwah") {
		screenGui.Enabled = true;
	} else {
		screenGui.Enabled = false;
	}
});