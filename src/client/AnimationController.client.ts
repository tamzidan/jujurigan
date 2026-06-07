import { Players, RunService } from "@rbxts/services";
import { StateManager } from "../shared/Modules/StateManager";
import { GetCharacterInfo, DEFAULT_CHARACTER_KEY } from "../shared/GameData/CharacterData";

const player = Players.LocalPlayer;

// ---------------------------------------------------------
// ANIMASI BARAYA (ID statis — tidak berubah per karakter)
// ---------------------------------------------------------
const sprintAnim = new Instance("Animation");
sprintAnim.AnimationId = "rbxassetid://111842276303136";

const crouchIdleAnim = new Instance("Animation");
crouchIdleAnim.AnimationId = "rbxassetid://94284522079811";

const crouchWalkAnim = new Instance("Animation");
crouchWalkAnim.AnimationId = "rbxassetid://73928148642491";

// Variabel penampung Track Animasi Baraya
let loadedSprint:     AnimationTrack | undefined = undefined;
let loadedCrouchIdle: AnimationTrack | undefined = undefined;
let loadedCrouchWalk: AnimationTrack | undefined = undefined;

// ---------------------------------------------------------
// ANIMASI JURIG — Dimuat dinamis dari CharacterData
// ---------------------------------------------------------
let loadedJurigAnimations: Map<string, AnimationTrack> = new Map();

// Helper: key karakter yang diequip
function getEquippedKey(): string {
	const key = player.GetAttribute("EquippedJurig") as string | undefined;
	return key ?? DEFAULT_CHARACTER_KEY;
}

function LoadJurigAnimations(character: Model) {
	const humanoid = character.WaitForChild("Humanoid", 5) as Humanoid | undefined;
	if (!humanoid) return;
	const animator = humanoid.WaitForChild("Animator", 5) as Animator | undefined;
	if (!animator) return;

	// Baca animation IDs dari CharacterData sesuai karakter yang diequip
	const charKey  = getEquippedKey();
	const charInfo = GetCharacterInfo(charKey);
	const animIds  = charInfo.Animations;

	loadedJurigAnimations.clear();

	for (const [name, id] of pairs(animIds)) {
		const anim           = new Instance("Animation");
		anim.AnimationId     = id as string;
		const track          = animator.LoadAnimation(anim);
		track.Priority       = Enum.AnimationPriority.Action;
		if (name === "Charged") track.Looped = true;
		loadedJurigAnimations.set(name as string, track);
	}

	print(`[AnimationController] Animasi Jurig dimuat untuk: ${charInfo.Name} (${charKey})`);
}

// Ekspor untuk dipakai modul lain jika diperlukan
export function PlayJurigAnimation(animName: string) {
	const track = loadedJurigAnimations.get(animName);
	if (track) {
		for (const [_, existingTrack] of loadedJurigAnimations) {
			if (existingTrack.IsPlaying) existingTrack.Stop(0.1);
		}
		track.Play();
	} else {
		warn(`[AnimationController] Animasi "${animName}" tidak ditemukan di memori!`);
	}
}

// ---------------------------------------------------------
// ANIMASI BARAYA — Setup saat spawn
// ---------------------------------------------------------
function setupBarayaAnimations(character: Model) {
	const humanoid = character.WaitForChild("Humanoid") as Humanoid;
	let animator   = humanoid.WaitForChild("Animator", 5) as Animator | undefined;

	if (!animator) {
		animator        = new Instance("Animator");
		animator.Parent = humanoid;
	}

	loadedSprint     = animator.LoadAnimation(sprintAnim);
	loadedSprint.Priority = Enum.AnimationPriority.Action;

	loadedCrouchIdle = animator.LoadAnimation(crouchIdleAnim);
	loadedCrouchIdle.Priority = Enum.AnimationPriority.Action;

	loadedCrouchWalk = animator.LoadAnimation(crouchWalkAnim);
	loadedCrouchWalk.Priority = Enum.AnimationPriority.Action;

	humanoid.Running.Connect((speed) => {
		const isCrouching = player.GetAttribute("IsCrouching") as boolean;
		const isSprinting = player.GetAttribute("IsSprinting") as boolean;

		if (isCrouching) {
			if (speed > 1) {
				if (loadedCrouchWalk && !loadedCrouchWalk.IsPlaying) loadedCrouchWalk.Play();
				if (loadedCrouchIdle && loadedCrouchIdle.IsPlaying)  loadedCrouchIdle.Stop();
			} else {
				if (loadedCrouchIdle && !loadedCrouchIdle.IsPlaying) loadedCrouchIdle.Play();
				if (loadedCrouchWalk && loadedCrouchWalk.IsPlaying)  loadedCrouchWalk.Stop();
			}
		} else if (isSprinting) {
			if (speed > 1) {
				if (loadedSprint && !loadedSprint.IsPlaying) loadedSprint.Play();
			} else {
				if (loadedSprint && loadedSprint.IsPlaying)  loadedSprint.Stop();
			}
		}
	});
}

// ---------------------------------------------------------
// UPDATE: Pilih animasi sesuai tim
// ---------------------------------------------------------
function UpdateAnimations() {
	const char = player.Character;
	if (!char) return;
	const team = player.Team ? player.Team.Name : "Arwah";

	if (team === "Jurig") {
		// Selalu reload agar animasi sesuai karakter yang sedang diequip
		LoadJurigAnimations(char);
	} else if (team === "Baraya") {
		setupBarayaAnimations(char);
	}
}

// ---------------------------------------------------------
// LIFECYCLE
// ---------------------------------------------------------
player.CharacterAdded.Connect((_char) => {
	UpdateAnimations();
});

player.GetPropertyChangedSignal("Team").Connect(UpdateAnimations);

// Re-load animasi Jurig saat karakter berganti (dari lobby/inventory)
player.GetAttributeChangedSignal("EquippedJurig").Connect(() => {
	const char = player.Character;
	if (char && player.Team?.Name === "Jurig") {
		print("[AnimationController] EquippedJurig berubah — reload animasi Jurig.");
		LoadJurigAnimations(char);
	}
});

if (player.Character) UpdateAnimations();

// ---------------------------------------------------------
// RESPONS ATRIBUT LARI / JONGKOK (Baraya)
// ---------------------------------------------------------
player.GetAttributeChangedSignal("IsSprinting").Connect(() => {
	const isSprinting = player.GetAttribute("IsSprinting") as boolean;
	if (isSprinting) {
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
		if (loadedCrouchIdle && loadedCrouchIdle.IsPlaying) loadedCrouchIdle.Stop();
		if (loadedCrouchWalk && loadedCrouchWalk.IsPlaying) loadedCrouchWalk.Stop();
	}
});

// ---------------------------------------------------------
// SUARA LANGKAH JONGKOK (Baraya) — Hilangkan saat jongkok
// ---------------------------------------------------------
RunService.RenderStepped.Connect(() => {
	const char = player.Character;
	if (char) {
		const rootPart = char.FindFirstChild("HumanoidRootPart") as Part | undefined;
		if (rootPart) {
			const runningSound = rootPart.FindFirstChild("Running") as Sound | undefined;
			if (runningSound) {
				if (player.GetAttribute("IsCrouching")) {
					runningSound.Volume = 0;
				} else {
					const currentSpeed = rootPart.AssemblyLinearVelocity.Magnitude;
					if (currentSpeed > 0.5 && runningSound.Volume === 0) {
						runningSound.Volume = (currentSpeed / 16) * 0.65;
					}
				}
			}
		}
	}
});