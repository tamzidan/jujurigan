import { Players, ContextActionService, TweenService, RunService, Workspace, ReplicatedStorage } from "@rbxts/services";

const player = Players.LocalPlayer;
const playerGui = player.WaitForChild("PlayerGui") as PlayerGui;

// ---------------------------------------------------------
// SETUP UI ELEMENTS (Auto-Reconstructable)
// ---------------------------------------------------------
interface UIComponents {
	screenGui: ScreenGui;
	progressContainer: Frame;
	progressFill: Frame;
	titleLabel: TextLabel;
	skillCheckContainer: Frame;
	outerRing: Frame;
	outerRingStroke: UIStroke;
	goodRing: Frame;
	greatRing: Frame;
}

let UI: UIComponents | undefined = undefined;

function createRing(size: number, color: Color3, thickness: number, parent: Instance) {
	const frame = new Instance("Frame");
	frame.Size = new UDim2(0, size, 0, size);
	frame.Position = new UDim2(0.5, -size / 2, 0.5, -size / 2);
	frame.BackgroundTransparency = 1;

	const corner = new Instance("UICorner");
	corner.CornerRadius = new UDim(1, 0);
	corner.Parent = frame;

	const stroke = new Instance("UIStroke");
	stroke.Color = color;
	stroke.Thickness = thickness;
	stroke.ApplyStrokeMode = Enum.ApplyStrokeMode.Border;
	stroke.Parent = frame;

	frame.Parent = parent;
	return frame;
}

function initUI() {
	const screenGui = new Instance("ScreenGui");
	screenGui.Name = "ActionGui";
	screenGui.ResetOnSpawn = false;
	screenGui.IgnoreGuiInset = true;
	screenGui.DisplayOrder = 100;
	screenGui.Parent = playerGui;

	const progressContainer = new Instance("Frame");
	progressContainer.Size = new UDim2(0, 300, 0, 15);
	progressContainer.Position = new UDim2(0.5, -150, 0.85, 0);
	progressContainer.BackgroundColor3 = new Color3(0, 0, 0);
	progressContainer.BackgroundTransparency = 0.5;
	progressContainer.Visible = false;
	progressContainer.Parent = screenGui;

	const progressCorner = new Instance("UICorner");
	progressCorner.CornerRadius = new UDim(0.5, 0);
	progressCorner.Parent = progressContainer;

	const progressFill = new Instance("Frame");
	progressFill.Size = new UDim2(0, 0, 1, 0);
	progressFill.BackgroundColor3 = new Color3(0.8, 0.1, 0.1);
	progressFill.Parent = progressContainer;

	const progressFillCorner = new Instance("UICorner");
	progressFillCorner.CornerRadius = new UDim(0.5, 0);
	progressFillCorner.Parent = progressFill;

	const titleLabel = new Instance("TextLabel");
	titleLabel.Size = new UDim2(1, 0, 0, 20);
	titleLabel.Position = new UDim2(0, 0, 0, -25);
	titleLabel.BackgroundTransparency = 1;
	titleLabel.TextColor3 = new Color3(1, 1, 1);
	titleLabel.TextScaled = true;
	titleLabel.Font = Enum.Font.Oswald;
	titleLabel.Text = "Melakukan Ritual...";
	titleLabel.Parent = progressContainer;

	const skillCheckContainer = new Instance("Frame");
	skillCheckContainer.Size = new UDim2(0, 200, 0, 200);
	skillCheckContainer.Position = new UDim2(0.5, -100, 0.5, -100);
	skillCheckContainer.BackgroundTransparency = 1;
	skillCheckContainer.Visible = false;
	skillCheckContainer.Parent = screenGui;

	// Ring hitam untuk area Good (70 - 100)
	const goodRing = createRing(85, new Color3(0, 0, 0), 15, skillCheckContainer);
	// Ring putih untuk area Great (60 - 70)
	const greatRing = createRing(65, new Color3(1, 1, 1), 5, skillCheckContainer);

	const outerRing = createRing(200, new Color3(1, 0, 0), 2, skillCheckContainer);
	const outerRingStroke = outerRing.FindFirstChildOfClass("UIStroke") as UIStroke;

	const instructionLabel = new Instance("TextLabel");
	instructionLabel.Size = new UDim2(1, 0, 0, 20);
	instructionLabel.Position = new UDim2(0, 0, 0.5, 65 / 2 + 10);
	instructionLabel.BackgroundTransparency = 1;
	instructionLabel.TextColor3 = new Color3(1, 1, 1);
	instructionLabel.TextScaled = true;
	instructionLabel.Font = Enum.Font.Oswald;
	instructionLabel.Text = "Tekan [SPASI] / TAP";
	instructionLabel.Parent = skillCheckContainer;

	return {
		screenGui,
		progressContainer,
		progressFill,
		titleLabel,
		skillCheckContainer,
		outerRing,
		outerRingStroke,
		goodRing,
		greatRing,
	};
}

function ensureUI() {
	if (!UI || UI?.screenGui.Parent !== playerGui) {
		UI = initUI();
	}
}

// ---------------------------------------------------------
// SKILL CHECK LOGIC
// ---------------------------------------------------------
let isSkillCheckActive = false;
let currentOuterSize = 200;
let skillCheckSpeed = 150; // pixels per second shrinking
let currentTargetInstance: Instance | undefined = undefined;

// Exported Function untuk dipanggil dari controller lain
function ShowProgressBar(title: string) {
	ensureUI();
	UI!.titleLabel.Text = title;
	UI!.progressContainer.Visible = true;
}

function HideProgressBar() {
	ensureUI();
	UI!.progressContainer.Visible = false;
	UI!.progressFill.Size = new UDim2(0, 0, 1, 0);
}

function UpdateProgress(percent: number) { // 0 to 1
	ensureUI();
	UI!.progressFill.Size = new UDim2(percent, 0, 1, 0);
}

function EndSkillCheck(success: boolean) {
	isSkillCheckActive = false;
	ensureUI();
	UI!.skillCheckContainer.Visible = false;
	ContextActionService.UnbindAction("SkillCheckHit");
	
	let result = "Fail";
	
	if (success) {
		const isGreat = currentOuterSize >= 60 && currentOuterSize <= 70;
		const isGood = currentOuterSize > 70 && currentOuterSize <= 100;

		if (isGreat) result = "Great";
		else if (isGood) result = "Good";
	}

	if (result !== "Fail") {
		print(`Penyelarasan Sukma BERHASIL! (${result})`);
	} else {
		print("Penyelarasan Sukma GAGAL!");
	}

	if (currentTargetInstance) {
		const RequestAction = ReplicatedStorage.WaitForChild("TS").WaitForChild("Events").WaitForChild("RequestAction") as RemoteEvent;
		RequestAction.FireServer("SkillCheckResult", result, currentTargetInstance);
	}
}

function handleSkillCheckInput(actionName: string, inputState: Enum.UserInputState) {
	if (inputState === Enum.UserInputState.Begin && isSkillCheckActive) {
		EndSkillCheck(true);
	}
}

function TriggerSkillCheck() {
	if (isSkillCheckActive) return;

	ensureUI();

	isSkillCheckActive = true;
	currentOuterSize = 200;
	UI!.outerRing.Size = new UDim2(0, currentOuterSize, 0, currentOuterSize);
	UI!.outerRing.Position = new UDim2(0.5, -currentOuterSize / 2, 0.5, -currentOuterSize / 2);
	UI!.outerRingStroke.Color = new Color3(1, 0, 0);
	UI!.skillCheckContainer.Visible = true;

	// Bind untuk semua platform
	ContextActionService.BindAction(
		"SkillCheckHit",
		handleSkillCheckInput,
		false,
		Enum.KeyCode.Space,
		Enum.UserInputType.MouseButton1,
		Enum.UserInputType.Touch
	);
}

// ---------------------------------------------------------
// PENGHUBUNG DENGAN STATUS PEMAIN
// ---------------------------------------------------------
let skillCheckTimer = 0;
let nextSkillCheckTime = math.random(3, 8);

RunService.RenderStepped.Connect((dt) => {
	const isRitualing = player.GetAttribute("IsRitualing");
	
	if (isRitualing) {
		ShowProgressBar("Menyelesaikan Ritual...");
		
		const char = player.Character;
		if (char) {
			const root = char.FindFirstChild("HumanoidRootPart") as Part | undefined;
			if (root) {
				for (const item of Workspace.GetDescendants()) {
					if (item.Name.match("^RitualSlot")[0]) {
						const pos = item.IsA("Attachment") ? item.WorldPosition : (item as BasePart).Position;
						if (root.Position.sub(pos).Magnitude <= 8) {
							const obj = item.Parent;
							if (obj) {
								const prog = (obj.GetAttribute("Progress") as number) || 0;
								UpdateProgress(prog / 100);
								currentTargetInstance = item;
							}
							break;
						}
					}
				}
			}
		}

		if (!isSkillCheckActive) {
			skillCheckTimer += dt;
			if (skillCheckTimer >= nextSkillCheckTime) {
				skillCheckTimer = 0;
				nextSkillCheckTime = math.random(5, 12);
				TriggerSkillCheck();
			}
		}
	} else {
		HideProgressBar();
		skillCheckTimer = 0;
		if (isSkillCheckActive) {
			EndSkillCheck(false); // Batalkan jika tiba-tiba berhenti
		}
	}

	if (isSkillCheckActive) {
		currentOuterSize -= skillCheckSpeed * dt;

		if (currentOuterSize < 50) {
			// Terlewat, gagal
			EndSkillCheck(false);
		} else {
			ensureUI();
			UI!.outerRing.Size = new UDim2(0, currentOuterSize, 0, currentOuterSize);
			UI!.outerRing.Position = new UDim2(0.5, -currentOuterSize / 2, 0.5, -currentOuterSize / 2);
			
			// Ubah warna jika sudah masuk range (60 - 100)
			if (currentOuterSize <= 100 && currentOuterSize >= 60) {
				if (UI!.outerRingStroke) UI!.outerRingStroke.Color = new Color3(0, 1, 0);
			} else {
				if (UI!.outerRingStroke) UI!.outerRingStroke.Color = new Color3(1, 0, 0);
			}
		}
	}
});
