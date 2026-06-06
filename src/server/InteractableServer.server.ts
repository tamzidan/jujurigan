import { ReplicatedStorage, Players, Workspace, RunService } from "@rbxts/services";
import { StateManager } from "../shared/Modules/StateManager";

const Shared = ReplicatedStorage.WaitForChild("TS") as Folder;
const Events = Shared.WaitForChild("Events") as Folder;
const RequestAction = Events.WaitForChild("RequestAction") as RemoteEvent;

const REPAIR_RANGE = 8;
const REPAIR_SPEED = 5;
const PALLET_RANGE = 6;
const VAULT_RANGE = 4;

const TARGET_GENERATOR = 1;
let completedGenerators = 0;
let isGateOpen = false;

// Di TypeScript kita menggunakan Map yang type-safe untuk objek seperti ini
const activeRepairs = new Map<Player, BasePart>();

Workspace.DescendantAdded.Connect((desc) => {
	if (desc.Name === "EscapeZone" && desc.IsA("BasePart")) {
		desc.Touched.Connect((hit) => {
			if (isGateOpen) {
				const char = hit.Parent;
				if (!char) return;
				const player = Players.GetPlayerFromCharacter(char);

				if (player && player.Team && player.Team.Name === "Baraya") {
					const currentState = StateManager.GetState(player);
					if (currentState !== "Escaped" && currentState !== "Dead") {
						print(`${player.Name} BERHASIL KABUR!`);
						StateManager.SetState(player, "Escaped");
					}
				}
			}
		});
	}
});

RequestAction.OnServerEvent.Connect((player, action) => {
	const char = player.Character;
	const rootPart = char?.FindFirstChild("HumanoidRootPart") as Part | undefined;
	if (!char || !rootPart) return;

	const myPos = rootPart.Position;
	const state = StateManager.GetState(player);

	if (player.Team && player.Team.Name === "Baraya") {
		if (action === "StartRepair") {
			if (state === "Healthy" || state === "Injured") {
				for (const item of Workspace.GetDescendants()) {
					if (item.Name === "Generator" && item.IsA("BasePart")) {
						const distance = myPos.sub(item.Position).Magnitude;
						if (distance <= REPAIR_RANGE) {
							const progress = (item.GetAttribute("Progress") as number) || 0;
							if (progress < 100) {
								activeRepairs.set(player, item);
								print(`${player.Name} mulai memperbaiki Generator`);
							}
							break;
						}
					}
				}
			}
		} else if (action === "StopRepair") {
			if (activeRepairs.has(player)) {
				activeRepairs.delete(player);
				print(`${player.Name} berhenti memperbaiki`);
			}
		} else if (action === "DropPallet") {
			if (state === "Healthy" || state === "Injured") {
				for (const item of Workspace.GetDescendants()) {
					if (item.Name === "Pallet" && item.IsA("BasePart")) {
						const isDropped = item.GetAttribute("IsDropped");
						if (!isDropped && myPos.sub(item.Position).Magnitude <= PALLET_RANGE) {
							item.SetAttribute("IsDropped", true);
							item.CFrame = item.CFrame.mul(new CFrame(0, -item.Size.Y / 2, item.Size.Y / 2)).mul(
								CFrame.Angles(math.rad(-90), 0, 0),
							);
							print("Pallet dijatuhkan!");

							for (const jPlayer of Players.GetPlayers()) {
								if (jPlayer.Team && jPlayer.Team.Name === "Jurig") {
									const jChar = jPlayer.Character;
									const jRoot = jChar?.FindFirstChild("HumanoidRootPart") as Part | undefined;
									if (jRoot) {
										const jDist = item.Position.sub(jRoot.Position).Magnitude;
										if (jDist <= 8) {
											StateManager.StunJurig(jPlayer, 3);
										}
									}
								}
							}
							break;
						}
					}
				}
			}

			// ==========================================
			// LOGIKA BARU: SPRINT DAN CROUCH
			// ==========================================
		} else if (action === "StartSprint") {
			StateManager.SetSprint(player, true);
		} else if (action === "StopSprint") {
			StateManager.SetSprint(player, false);
		} else if (action === "StartCrouch") {
			StateManager.SetCrouch(player, true);
		} else if (action === "StopCrouch") {
			StateManager.SetCrouch(player, false);
		}
	}

	// LOGIKA VAULTING (Bisa dilakukan oleh Baraya maupun Jurig)
	if (action === "Vault") {
		// Hanya bisa lompat jika status normal
		if (state === "Healthy" || state === "Injured" || player.Team?.Name === "Jurig") {
			for (const item of Workspace.GetDescendants()) {
				if (item.Name === "Window" && item.IsA("BasePart")) {
					const distance = myPos.sub(item.Position).Magnitude;

					if (distance <= VAULT_RANGE) {
						const forwardVector = rootPart.CFrame.LookVector;

						// MENERAPKAN SKILL PASIF KARAKTER
						let vaultPower = 6; // Jarak lompat normal (6 stud)

						if (player.Team?.Name === "Jurig") {
							const equippedJurig = player.GetAttribute("EquippedJurig");
							if (equippedJurig === "Pocong") {
								vaultPower = 14; // Pocong melompat lebih jauh!
								print(">>> PASIF AKTIF: Pocong lompat jauh sejauh 14 stud! <<<");
							}
						}

						// Teleport (dorong) karakter ke depan menembus jendela
						char.PivotTo(rootPart.CFrame.add(forwardVector.mul(vaultPower)));
						print(`${player.Name} melewati jendela!`);
						break;
					}
				}
			}
		}
	}
});

RunService.Heartbeat.Connect((deltaTime) => {
	for (const [p, generator] of activeRepairs) {
		const char = p.Character;
		const rootPart = char?.FindFirstChild("HumanoidRootPart") as Part | undefined;

		if (!char || !rootPart) {
			activeRepairs.delete(p);
			continue;
		}

		const currentState = StateManager.GetState(p);
		if (
			currentState === "Knock" ||
			currentState === "Carried" ||
			currentState === "Hooked" ||
			currentState === "Dead"
		) {
			activeRepairs.delete(p);
			continue;
		}

		const distance = rootPart.Position.sub(generator.Position).Magnitude;
		if (distance > REPAIR_RANGE) {
			activeRepairs.delete(p);
			continue;
		}

		let currentProgress = (generator.GetAttribute("Progress") as number) || 0;
		if (currentProgress < 100) {
			currentProgress += REPAIR_SPEED * deltaTime;

			if (currentProgress >= 100) {
				currentProgress = 100;
				activeRepairs.delete(p);

				generator.BrickColor = new BrickColor("Bright yellow");
				generator.Material = Enum.Material.Neon;
				print("Satu Generator telah selesai diperbaiki!");

				completedGenerators += 1;
				if (completedGenerators >= TARGET_GENERATOR && !isGateOpen) {
					isGateOpen = true;
					print("GERBANG TERBUKA! BARAYA SEGERA KABUR!");

					for (const item of Workspace.GetDescendants()) {
						if (item.Name === "EscapeDoor" && item.IsA("BasePart")) {
							item.Transparency = 0.5;
							item.CanCollide = false;
							item.BrickColor = new BrickColor("Bright green");
						}
					}
				}
			}
			generator.SetAttribute("Progress", currentProgress);
		}
	}
});

Workspace.ChildRemoved.Connect((child) => {
	// Di TS kita gunakan string.match untuk meniru pola pencarian di Lua
	if (child.Name.match("Map_")[0]) {
		completedGenerators = 0;
		isGateOpen = false;
		activeRepairs.clear();
	}
});