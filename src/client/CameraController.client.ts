import { Players } from "@rbxts/services";

const player = Players.LocalPlayer;

function UpdateCamera() {
	const teamName = player.Team ? player.Team.Name : "Arwah";

	if (teamName === "Jurig") {
		// Jurig dipaksa menggunakan sudut pandang orang pertama (First-Person)
		player.CameraMode = Enum.CameraMode.LockFirstPerson;
		player.CameraMinZoomDistance = 0.5;
		player.CameraMaxZoomDistance = 0.5;
	} else if (teamName === "Baraya") {
		// Baraya menggunakan sudut pandang orang ketiga (Third-Person) dengan zoom terbatas
		player.CameraMode = Enum.CameraMode.Classic;
		player.CameraMinZoomDistance = 5;
		player.CameraMaxZoomDistance = 12;
	} else {
		// Arwah / saat di Lobby bebas zoom
		player.CameraMode = Enum.CameraMode.Classic;
		player.CameraMinZoomDistance = 10;
		player.CameraMaxZoomDistance = 50;
	}
}

// Deteksi saat tim pemain berubah
player.GetPropertyChangedSignal("Team").Connect(UpdateCamera);

// Panggil satu kali saat skrip pertama kali berjalan
UpdateCamera();