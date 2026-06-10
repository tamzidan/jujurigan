import { ContextActionService, ReplicatedStorage, Players, RunService, Workspace } from "@rbxts/services";
const player = Players.LocalPlayer;

const Shared        = ReplicatedStorage.WaitForChild("TS") as Folder;
const Events        = Shared.WaitForChild("Events") as Folder;
const RequestAction = Events.WaitForChild("RequestAction") as RemoteEvent;

const REPAIR_RANGE    = 8;
const PALLET_RANGE    = 6;
const VAULT_RANGE     = 4;
const INTERACT_RANGE  = 7;

let currentDynamicAction: string | undefined = undefined;
let currentActionTarget: Instance | undefined = undefined;

// ---------------------------------------------------------
// DYNAMIC ACTION HANDLER
// ---------------------------------------------------------
function handleDynamicAction(actionName: string, inputState: Enum.UserInputState, inputObject: InputObject) {
	if (inputState === Enum.UserInputState.Begin) {
		if (player.GetAttribute("IsStunned")) return;
		if (currentDynamicAction) {
			RequestAction.FireServer(currentDynamicAction, currentActionTarget);
			if (currentDynamicAction === "StartRitual") {
				player.SetAttribute("IsRitualing", true);
			}
		}
	} else if (inputState === Enum.UserInputState.End) {
		// Do nothing for StartRitual on End, because they will cancel it via WASD movement.
		// StopRitual is now triggered automatically by movement in RenderStepped.
	}
}

// ---------------------------------------------------------
// BINDINGS
// ---------------------------------------------------------
function SetupInteraction() {
	const teamName = player.Team ? player.Team.Name : "Arwah";
	ContextActionService.UnbindAction("DynamicAction");

	if (teamName === "Jurig") {
		ContextActionService.BindAction("DynamicAction", handleDynamicAction, true, Enum.KeyCode.F, Enum.UserInputType.MouseButton1);
		ContextActionService.SetTitle("DynamicAction", "Aksi");
		ContextActionService.SetPosition("DynamicAction", new UDim2(0.8, -10, 0.65, 0));
	} else if (teamName === "Baraya") {
		ContextActionService.BindAction("DynamicAction", handleDynamicAction, true,
			Enum.KeyCode.E, Enum.KeyCode.F, Enum.KeyCode.Space, Enum.KeyCode.Q, Enum.UserInputType.MouseButton1);
		ContextActionService.SetTitle("DynamicAction", "Aksi");
		ContextActionService.SetPosition("DynamicAction", new UDim2(0.8, -10, 0.65, 0));
	}
}

player.GetPropertyChangedSignal("Team").Connect(SetupInteraction);
player.CharacterAdded.Connect(() => {
	SetupInteraction();
});
SetupInteraction();

// ---------------------------------------------------------
// RADAR PENDETEKSI OBJEK
// ---------------------------------------------------------
function ScanForInteractables() {
	const teamName = player.Team ? player.Team.Name : "Arwah";
	if (teamName === "Arwah") return;

	if (player.GetAttribute("IsStunned")) {
		currentDynamicAction = undefined;
		currentActionTarget = undefined;
		pcall(() => { ContextActionService.SetTitle("DynamicAction", ""); });
		return;
	}

	const char = player.Character;
	if (!char) return;
	const rootPart = char.FindFirstChild("HumanoidRootPart") as Part | undefined;
	if (!rootPart) return;

	const myPos = rootPart.Position;
	let closestAction: string | undefined = undefined;
	let closestTarget: Instance | undefined = undefined;
	let closestTitle = "Aksi";
	let minDistance  = math.huge;

	if (teamName === "Baraya") {
		for (const item of Workspace.GetDescendants()) {
			if (item.Name.match("^RitualSlot")[0]) {
				const pos = item.IsA("Attachment") ? item.WorldPosition : (item as BasePart).Position;
				const dist = myPos.sub(pos).Magnitude;
				
				if (dist <= REPAIR_RANGE && dist < minDistance) {
					// Check if RitualObject is not complete
					const ritualObj = item.Parent;
					if (ritualObj) {
						const prog = (ritualObj.GetAttribute("Progress") as number) || 0;
						if (prog < 100) {
							minDistance = dist; 
							closestAction = "StartRitual"; 
							closestTarget = item;
							closestTitle = "Ritual";
						}
					}
				}
			} else if (item.Name === "Pallet" && item.IsA("BasePart")) {
				const dist = myPos.sub(item.Position).Magnitude;
				if (dist <= PALLET_RANGE && dist < minDistance) {
					if (!item.GetAttribute("IsDropped")) {
						minDistance = dist; closestAction = "DropPallet"; closestTitle = "Pallet"; closestTarget = item;
					}
				}
			} else if (item.Name === "Window" && item.IsA("BasePart")) {
				const dist = myPos.sub(item.Position).Magnitude;
				if (dist <= VAULT_RANGE && dist < minDistance) {
					minDistance = dist; closestAction = "Vault"; closestTitle = "Lompat"; closestTarget = item;
				}
			}
		}
		for (const targetPlayer of Players.GetPlayers()) {
			if (targetPlayer !== player && targetPlayer.Team?.Name === "Baraya") {
				const tRoot = targetPlayer.Character?.FindFirstChild("HumanoidRootPart") as Part | undefined;
				if (tRoot) {
					const dist = myPos.sub(tRoot.Position).Magnitude;
					if (dist <= INTERACT_RANGE && dist < minDistance) {
						if (targetPlayer.GetAttribute("HealthState") === "Hooked") {
							minDistance = dist; closestAction = "Carry"; closestTitle = "Tolong";
						}
					}
				}
			}
		}

	} else if (teamName === "Jurig") {
		const isCarrying = char.FindFirstChild("CarryWeld") !== undefined;

		if (isCarrying) {
			for (const item of Workspace.GetDescendants()) {
				if (item.Name === "TumbalHook" && item.IsA("BasePart")) {
					const dist = myPos.sub(item.Position).Magnitude;
					if (dist <= INTERACT_RANGE && dist < minDistance) {
						minDistance = dist; closestAction = "Carry"; closestTitle = "Gantung";
					}
				}
			}
			if (closestAction === undefined) {
				closestAction = "DropBaraya";
				closestTitle = "Jatuhkan";
			}
		} else {
			for (const item of Workspace.GetDescendants()) {
				if (item.Name === "Window" && item.IsA("BasePart")) {
					const dist = myPos.sub(item.Position).Magnitude;
					if (dist <= VAULT_RANGE && dist < minDistance) {
						minDistance = dist; closestAction = "Vault"; closestTitle = "Lompat";
					}
				}
			}
			for (const targetPlayer of Players.GetPlayers()) {
				if (targetPlayer.Team?.Name === "Baraya") {
					const tRoot = targetPlayer.Character?.FindFirstChild("HumanoidRootPart") as Part | undefined;
					if (tRoot) {
						const dist = myPos.sub(tRoot.Position).Magnitude;
						if (dist <= INTERACT_RANGE && dist < minDistance) {
							if (targetPlayer.GetAttribute("HealthState") === "Knock") {
								minDistance = dist; closestAction = "Carry"; closestTitle = "Gendong";
							}
						}
					}
				}
			}
		}
	}

	currentDynamicAction = closestAction;
	currentActionTarget = closestTarget;
	pcall(() => { ContextActionService.SetTitle("DynamicAction", closestTitle); });
}

let scanTimer = 0;
RunService.Heartbeat.Connect((deltaTime) => {
	scanTimer += deltaTime;
	if (scanTimer >= 0.1) { scanTimer = 0; ScanForInteractables(); }
});

// ---------------------------------------------------------
// CANCEL RITUAL ON MOVEMENT
// ---------------------------------------------------------
RunService.RenderStepped.Connect(() => {
	if (player.GetAttribute("IsRitualing")) {
		const char = player.Character;
		const humanoid = char?.FindFirstChild("Humanoid") as Humanoid | undefined;
		if (humanoid && humanoid.MoveDirection.Magnitude > 0) {
			RequestAction.FireServer("StopRitual");
			player.SetAttribute("IsRitualing", false);
			currentDynamicAction = undefined;
		}
	}
});
