import { Players } from "@rbxts/services";

const player = Players.LocalPlayer;
const PlayerGui = player.WaitForChild("PlayerGui") as PlayerGui;

// 1. Membuat Layar GUI Utama
const screenGui = new Instance("ScreenGui");
screenGui.Name = "ViolenceDistrictHUD";
screenGui.ResetOnSpawn = false; // Agar UI tidak hilang saat karakter mati/respawn
screenGui.Parent = PlayerGui;

// 2. Membuat Label Teks Status (Di bagian bawah tengah layar)
const statusLabel = new Instance("TextLabel");
statusLabel.Size = new UDim2(0, 350, 0, 50);
statusLabel.Position = new UDim2(0.5, 0, 0.9, -20);
statusLabel.AnchorPoint = new Vector2(0.5, 0.5);
statusLabel.BackgroundColor3 = Color3.fromRGB(20, 20, 20);
statusLabel.BackgroundTransparency = 0.5;
statusLabel.TextColor3 = Color3.fromRGB(255, 255, 255);
statusLabel.Font = Enum.Font.GothamBold;
statusLabel.TextSize = 20;
statusLabel.Parent = screenGui;

// Mempercantik kotak dengan sudut melengkung
const uiCorner = new Instance("UICorner");
uiCorner.CornerRadius = new UDim(0, 8);
uiCorner.Parent = statusLabel;

// 3. Fungsi Utama untuk Memperbarui Layar
function UpdateHUD() {
	const teamName = player.Team ? player.Team.Name : "Belum Ada Tim";

	if (teamName === "Jurig") {
		statusLabel.Text = "Peran: JURIG | Status: Kebal";
		statusLabel.TextColor3 = Color3.fromRGB(255, 80, 80); // Merah terang
	} else if (teamName === "Baraya") {
		// Ambil status kesehatan dari Attribute
		const state = (player.GetAttribute("HealthState") as string) || "Healthy";
		statusLabel.Text = `Peran: BARAYA | Status: ${state.upper()}`;

		// Beri warna berbeda berdasarkan tingkat keparahan
		if (state === "Healthy") {
			statusLabel.TextColor3 = Color3.fromRGB(80, 200, 255); // Biru
		} else if (state === "Injured") {
			statusLabel.TextColor3 = Color3.fromRGB(255, 200, 50); // Kuning
		} else if (state === "Knock") {
			statusLabel.TextColor3 = Color3.fromRGB(255, 120, 50); // Oranye
		} else if (state === "Hooked") {
			statusLabel.TextColor3 = Color3.fromRGB(255, 0, 0); // Merah Darah
		} else {
			statusLabel.TextColor3 = Color3.fromRGB(150, 150, 150); // Abu-abu
		}
	} else {
		// Jika Arwah / Lobby
		statusLabel.Text = "Lobby: Menunggu Permainan...";
		statusLabel.TextColor3 = Color3.fromRGB(220, 220, 220); // Putih
	}
}

// 4. Pemicu Otomatis (Event Listeners)
// Jika attribute "HealthState" berubah, jalankan fungsi UpdateHUD
player.GetAttributeChangedSignal("HealthState").Connect(UpdateHUD);

// Jika pemain ganti tim (misal dari Arwah ke Baraya), jalankan fungsi UpdateHUD
player.GetPropertyChangedSignal("Team").Connect(UpdateHUD);

// Panggil satu kali saat pertama masuk
UpdateHUD();