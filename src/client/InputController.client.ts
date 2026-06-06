import { ContextActionService, ReplicatedStorage, Players, RunService, Workspace } from "@rbxts/services";

const player = Players.LocalPlayer;

const Shared = ReplicatedStorage.WaitForChild("TS") as Folder;
const Events = Shared.WaitForChild("Events") as Folder;
const RequestAction = Events.WaitForChild("RequestAction") as RemoteEvent;

// Konstanta (Harus sama dengan jangkauan di Server)
const ATTACK_COOLDOWN = 1.5;
const REPAIR_RANGE = 8;
const PALLET_RANGE = 6;
const VAULT_RANGE = 4;
const INTERACT_RANGE = 7;

let isAttacking = false;
let currentDynamicAction: string | undefined = undefined; // Menyimpan aksi apa yang sedang aktif di dekat pemain

// ---------------------------------------------------------
// 1. FUNGSI AKSI STATIS (Lari, Jongkok, Pukul)
// ---------------------------------------------------------

function handleHit(actionName: string, inputState: Enum.UserInputState, inputObject: InputObject) {
	if (inputState === Enum.UserInputState.Begin) {
		if (player.Team && player.Team.Name === "Jurig") {
			if (!isAttacking) {
				isAttacking = true;
				RequestAction.FireServer("Hit");
				task.wait(ATTACK_COOLDOWN);
				isAttacking = false;
			}
		}
	}
}

function handleSprint(actionName: string, inputState: Enum.UserInputState, inputObject: InputObject) {
	if (inputState === Enum.UserInputState.Begin) {
		if (player.Team && player.Team.Name === "Baraya") {
			const isSprinting = (player.GetAttribute("IsSprinting") as boolean) || false;
			if (isSprinting) {
				RequestAction.FireServer("StopSprint");
			} else {
				RequestAction.FireServer("StartSprint");
			}
		}
	}
}

function handleCrouch(actionName: string, inputState: Enum.UserInputState, inputObject: InputObject) {
	if (inputState === Enum.UserInputState.Begin) {
		if (player.Team && player.Team.Name === "Baraya") {
			const isCrouching = (player.GetAttribute("IsCrouching") as boolean) || false;
			if (isCrouching) {
				RequestAction.FireServer("StopCrouch");
			} else {
				RequestAction.FireServer("StartCrouch");
			}
		}
	}
}

// ---------------------------------------------------------
// 2. FUNGSI AKSI DINAMIS (Satu Tombol Banyak Fungsi)
// ---------------------------------------------------------

function handleDynamicAction(actionName: string, inputState: Enum.UserInputState, inputObject: InputObject) {
	if (inputState === Enum.UserInputState.Begin) {
		// Kirim perintah aksi yang saat ini terdeteksi ke server
		if (currentDynamicAction) {
			RequestAction.FireServer(currentDynamicAction);
		}
	} else if (inputState === Enum.UserInputState.End) {
		// Khusus untuk tombol yang perlu ditahan, jika dilepas kirim "Stop"
		if (currentDynamicAction === "StartRepair") {
			RequestAction.FireServer("StopRepair");
		}
	}
}

// ---------------------------------------------------------
// 3. SISTEM UI TOMBOL AWAL BERDASARKAN TIM
// ---------------------------------------------------------

function SetupMobileButtons() {
	const teamName = player.Team ? player.Team.Name : "Arwah";

	// Bersihkan semua tombol lama
	ContextActionService.UnbindAction("HitAction");
	ContextActionService.UnbindAction("SprintAction");
	ContextActionService.UnbindAction("CrouchAction");
	ContextActionService.UnbindAction("DynamicAction");

	if (teamName === "Jurig") {
		// Tombol Pukul (Kiri)
		ContextActionService.BindAction("HitAction", handleHit, true, Enum.UserInputType.MouseButton1);
		ContextActionService.SetTitle("HitAction", "Pukul");
		ContextActionService.SetPosition("HitAction", new UDim2(0.2, 0, 0.65, 0));

		// Tombol Aksi Dinamis (Kanan)
		ContextActionService.BindAction("DynamicAction", handleDynamicAction, true, Enum.KeyCode.F);
		ContextActionService.SetTitle("DynamicAction", "Aksi");
		ContextActionService.SetPosition("DynamicAction", new UDim2(0.8, -10, 0.65, 0));
	} else if (teamName === "Baraya") {
		// Lari dan Jongkok (Kiri)
		ContextActionService.BindAction("SprintAction", handleSprint, true, Enum.KeyCode.LeftShift);
		ContextActionService.SetTitle("SprintAction", "Lari");
		ContextActionService.SetPosition("SprintAction", new UDim2(0.2, 0, 0.65, 0));

		ContextActionService.BindAction(
			"CrouchAction",
			handleCrouch,
			true,
			Enum.KeyCode.C,
			Enum.KeyCode.LeftControl,
		);
		ContextActionService.SetTitle("CrouchAction", "Jongkok");
		ContextActionService.SetPosition("CrouchAction", new UDim2(0.2, 0, 0.85, 0));

		// Tombol Aksi Dinamis (Kanan) - Untuk Repair, Vault, Pallet, Carry
		ContextActionService.BindAction(
			"DynamicAction",
			handleDynamicAction,
			true,
			Enum.KeyCode.E,
			Enum.KeyCode.F,
			Enum.KeyCode.Space,
			Enum.KeyCode.Q,
		);
		ContextActionService.SetTitle("DynamicAction", "Aksi");
		ContextActionService.SetPosition("DynamicAction", new UDim2(0.8, -10, 0.65, 0));
	}
}

player.GetPropertyChangedSignal("Team").Connect(SetupMobileButtons);
SetupMobileButtons();

// ---------------------------------------------------------
// 4. RADAR PENDETEKSI OBJEK (MENGUBAH TULISAN TOMBOL)
// ---------------------------------------------------------

function ScanForInteractables() {
	const teamName = player.Team ? player.Team.Name : "Arwah";
	if (teamName === "Arwah") return;

	const char = player.Character;
	if (!char) return;
	const rootPart = char.FindFirstChild("HumanoidRootPart") as Part | undefined;
	if (!rootPart) return;

	const myPos = rootPart.Position;

	let closestAction: string | undefined = undefined;
	let closestTitle = "Aksi";
	let minDistance = math.huge;

	// Logika Baraya mencari benda
	if (teamName === "Baraya") {
		for (const item of Workspace.GetDescendants()) {
			// Cek Generator
			if (item.Name === "Generator" && item.IsA("BasePart")) {
				const dist = myPos.sub(item.Position).Magnitude;
				if (dist <= REPAIR_RANGE && dist < minDistance) {
					const prog = (item.GetAttribute("Progress") as number) || 0;
					if (prog < 100) {
						minDistance = dist;
						closestAction = "StartRepair";
						closestTitle = "Perbaiki";
					}
				}
				// Cek Pallet
			} else if (item.Name === "Pallet" && item.IsA("BasePart")) {
				const dist = myPos.sub(item.Position).Magnitude;
				if (dist <= PALLET_RANGE && dist < minDistance) {
					if (!item.GetAttribute("IsDropped")) {
						minDistance = dist;
						closestAction = "DropPallet";
						closestTitle = "Pallet";
					}
				}
				// Cek Jendela
			} else if (item.Name === "Window" && item.IsA("BasePart")) {
				const dist = myPos.sub(item.Position).Magnitude;
				if (dist <= VAULT_RANGE && dist < minDistance) {
					minDistance = dist;
					closestAction = "Vault";
					closestTitle = "Lompat";
				}
			}
		}

		// Cek Teman yang butuh ditolong
		for (const targetPlayer of Players.GetPlayers()) {
			if (targetPlayer !== player && targetPlayer.Team && targetPlayer.Team.Name === "Baraya") {
				const tChar = targetPlayer.Character;
				const tRoot = tChar?.FindFirstChild("HumanoidRootPart") as Part | undefined;
				if (tRoot) {
					const dist = myPos.sub(tRoot.Position).Magnitude;
					if (dist <= INTERACT_RANGE && dist < minDistance) {
						if (targetPlayer.GetAttribute("HealthState") === "Hooked") {
							minDistance = dist;
							closestAction = "Carry";
							closestTitle = "Tolong";
						}
					}
				}
			}
		}

		// Logika Jurig mencari benda
	} else if (teamName === "Jurig") {
		for (const item of Workspace.GetDescendants()) {
			// Cek Jendela
			if (item.Name === "Window" && item.IsA("BasePart")) {
				const dist = myPos.sub(item.Position).Magnitude;
				if (dist <= VAULT_RANGE && dist < minDistance) {
					minDistance = dist;
					closestAction = "Vault";
					closestTitle = "Lompat";
				}
				// Cek Hook (Hanya jika sedang menggendong)
			} else if (item.Name === "TumbalHook" && item.IsA("BasePart")) {
				if (char.FindFirstChild("CarryWeld")) {
					const dist = myPos.sub(item.Position).Magnitude;
					if (dist <= INTERACT_RANGE && dist < minDistance) {
						minDistance = dist;
						closestAction = "Carry";
						closestTitle = "Gantung";
					}
				}
			}
		}

		// Cek Korban untuk digendong (Hanya jika belum menggendong)
		if (!char.FindFirstChild("CarryWeld")) {
			for (const targetPlayer of Players.GetPlayers()) {
				if (targetPlayer.Team && targetPlayer.Team.Name === "Baraya") {
					const tChar = targetPlayer.Character;
					const tRoot = tChar?.FindFirstChild("HumanoidRootPart") as Part | undefined;
					if (tRoot) {
						const dist = myPos.sub(tRoot.Position).Magnitude;
						if (dist <= INTERACT_RANGE && dist < minDistance) {
							if (targetPlayer.GetAttribute("HealthState") === "Knock") {
								minDistance = dist;
								closestAction = "Carry";
								closestTitle = "Gendong";
							}
						}
					}
				}
			}
		}
	}

	// Perbarui Status Aksi saat ini
	currentDynamicAction = closestAction;

	// Mengubah teks UI tombol bawaan ContextActionService secara aman
	pcall(() => {
		ContextActionService.SetTitle("DynamicAction", closestTitle);
	});
}

// Menjalankan radar pengecekan 10 kali per detik agar sangat ringan di HP
let timer = 0;
RunService.Heartbeat.Connect((deltaTime) => {
	timer += deltaTime;
	if (timer >= 0.1) {
		timer = 0;
		ScanForInteractables();
	}
});