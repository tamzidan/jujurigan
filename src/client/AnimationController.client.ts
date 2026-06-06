import { Players, RunService } from "@rbxts/services";

const player = Players.LocalPlayer;

// 1. Setup ID Animasi
const sprintAnim = new Instance("Animation");
sprintAnim.AnimationId = "rbxassetid://111842276303136";

const crouchIdleAnim = new Instance("Animation");
crouchIdleAnim.AnimationId = "rbxassetid://94284522079811";

const crouchWalkAnim = new Instance("Animation");
crouchWalkAnim.AnimationId = "rbxassetid://73928148642491";

// Variabel penampung Track Animasi
let loadedSprint: AnimationTrack | undefined = undefined;
let loadedCrouchIdle: AnimationTrack | undefined = undefined;
let loadedCrouchWalk: AnimationTrack | undefined = undefined;

// 2. Fungsi memuat animasi ke Animator karakter
function setupAnimations(character: Model) {
	const humanoid = character.WaitForChild("Humanoid") as Humanoid;
	let animator = humanoid.WaitForChild("Animator", 5) as Animator | undefined;

	if (!animator) {
		animator = new Instance("Animator");
		animator.Parent = humanoid;
	}

	// Muat animasi dan atur prioritas menjadi 'Action' agar menimpa gerak jalan bawaan Roblox
	loadedSprint = animator.LoadAnimation(sprintAnim);
	loadedSprint.Priority = Enum.AnimationPriority.Action;

	loadedCrouchIdle = animator.LoadAnimation(crouchIdleAnim);
	loadedCrouchIdle.Priority = Enum.AnimationPriority.Action;

	loadedCrouchWalk = animator.LoadAnimation(crouchWalkAnim);
	loadedCrouchWalk.Priority = Enum.AnimationPriority.Action;

	// 3. Deteksi Kecepatan Berjalan (Untuk memisahkan Jongkok Diam vs Jongkok Jalan)
	humanoid.Running.Connect((speed) => {
		const isCrouching = player.GetAttribute("IsCrouching") as boolean;
		const isSprinting = player.GetAttribute("IsSprinting") as boolean;

		if (isCrouching) {
			if (speed > 1) {
				if (loadedCrouchWalk && !loadedCrouchWalk.IsPlaying) loadedCrouchWalk.Play();
				if (loadedCrouchIdle && loadedCrouchIdle.IsPlaying) loadedCrouchIdle.Stop();
			} else {
				if (loadedCrouchIdle && !loadedCrouchIdle.IsPlaying) loadedCrouchIdle.Play();
				if (loadedCrouchWalk && loadedCrouchWalk.IsPlaying) loadedCrouchWalk.Stop();
			}
		} else if (isSprinting) {
			if (speed > 1) {
				if (loadedSprint && !loadedSprint.IsPlaying) loadedSprint.Play();
			} else {
				if (loadedSprint && loadedSprint.IsPlaying) loadedSprint.Stop();
			}
		}
	});
}

// Panggil saat karakter di-spawn pertama kali atau setelah mati
player.CharacterAdded.Connect((char) => setupAnimations(char));
if (player.Character) {
	setupAnimations(player.Character);
}

// 4. Merespons pergantian Status (Lari/Jongkok/Normal) dari Server
player.GetAttributeChangedSignal("IsSprinting").Connect(() => {
	const isSprinting = player.GetAttribute("IsSprinting") as boolean;
	if (isSprinting) {
		// Hanya putar animasi lari jika pemain menekan tombol arah (sedang bergerak)
		const humanoid = player.Character?.FindFirstChild("Humanoid") as Humanoid | undefined;
		if (humanoid && humanoid.MoveDirection.Magnitude > 0) {
			if (loadedSprint && !loadedSprint.IsPlaying) loadedSprint.Play();
		}
	} else {
		if (loadedSprint && loadedSprint.IsPlaying) loadedSprint.Stop();
	}
});

player.GetAttributeChangedSignal("IsCrouching").Connect(() => {
	const isCrouching = player.GetAttribute("IsCrouching") as boolean;
	if (isCrouching) {
		const humanoid = player.Character?.FindFirstChild("Humanoid") as Humanoid | undefined;
		if (humanoid && humanoid.MoveDirection.Magnitude > 0) {
			if (loadedCrouchWalk && !loadedCrouchWalk.IsPlaying) loadedCrouchWalk.Play();
		} else {
			if (loadedCrouchIdle && !loadedCrouchIdle.IsPlaying) loadedCrouchIdle.Play();
		}
	} else {
		// Berhenti dari posisi jongkok, hentikan semua track
		if (loadedCrouchIdle && loadedCrouchIdle.IsPlaying) loadedCrouchIdle.Stop();
		if (loadedCrouchWalk && loadedCrouchWalk.IsPlaying) loadedCrouchWalk.Stop();
	}
});

// 5. LOGIKA BARU: Menghilangkan Suara Langkah Saat Jongkok
RunService.RenderStepped.Connect(() => {
	const char = player.Character;
	if (char) {
		const rootPart = char.FindFirstChild("HumanoidRootPart") as Part | undefined;
		if (rootPart) {
			// Mencari komponen suara bawaan Roblox bernama "Running"
			const runningSound = rootPart.FindFirstChild("Running") as Sound | undefined;
			if (runningSound) {
				if (player.GetAttribute("IsCrouching")) {
					// Jika sedang jongkok, paksa volume menjadi 0
					runningSound.Volume = 0;
				} else {
					// Jika sudah tidak jongkok, tapi suaranya "nyangkut" di 0
					const currentSpeed = rootPart.AssemblyLinearVelocity.Magnitude;
					if (currentSpeed > 0.5 && runningSound.Volume === 0) {
						// Kita pancing dengan rumus default Roblox: (Kecepatan / 16) * 0.65
						// Setelah dipancing, skrip bawaan Roblox akan otomatis mengambil alih kembali
						runningSound.Volume = (currentSpeed / 16) * 0.65;
					}
				}
			}
		}
	}
});