import { ReplicatedStorage, Players, Workspace, RunService } from "@rbxts/services";
import { StateManager } from "../shared/Modules/StateManager";

const Shared = ReplicatedStorage.WaitForChild("TS") as Folder;
const Events = Shared.WaitForChild("Events") as Folder;
const RequestAction = Events.WaitForChild("RequestAction") as RemoteEvent;

const REPAIR_RANGE = 8;
const REPAIR_SPEED = 5;
const PALLET_RANGE = 6;
const VAULT_RANGE = 4;

const TARGET_RITUAL = 1;
let completedRituals = 0;
let isGateOpen = false;

// Di TypeScript kita menggunakan Map yang type-safe untuk objek seperti ini
const activeRituals = new Map<Player, Instance>();

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

RequestAction.OnServerEvent.Connect((player, action, targetObject, extraArg) => {
	const char = player.Character;
	const rootPart = char?.FindFirstChild("HumanoidRootPart") as Part | undefined;
	if (!char || !rootPart) return;

	const myPos = rootPart.Position;
	const state = StateManager.GetState(player);

	if (player.Team && player.Team.Name === "Baraya") {
		if (action === "StartRitual") {
			if (state === "Healthy" || state === "Injured") {
				const slot = targetObject as Instance;
				if (slot && slot.Name.match("^RitualSlot")[0]) {
					const pos = slot.IsA("Attachment") ? slot.WorldPosition : (slot as BasePart).Position;
					const cframe = slot.IsA("Attachment") ? slot.WorldCFrame : (slot as BasePart).CFrame;
					const distance = myPos.sub(pos).Magnitude;
					
					if (distance <= REPAIR_RANGE) {
						let taken = false;
						for (const [p, s] of activeRituals) {
							if (s === slot) { taken = true; break; }
						}
						
						if (!taken) {
							const ritualObj = slot.Parent;
							if (ritualObj) {
								const progress = (ritualObj.GetAttribute("Progress") as number) || 0;
								if (progress < 100) {
									activeRituals.set(player, slot);
									rootPart.Anchored = true;
									// Tambahkan offset Y agar tidak tenggelam ke tanah
									rootPart.CFrame = cframe.add(new Vector3(0, 3, 0)); 
									print(`${player.Name} mulai melakukan Ritual`);
								}
							}
						}
					}
				}
			}
		} else if (action === "SkillCheckResult") {
			const result = targetObject as string; // "Great", "Good", or "Fail"
			const ritualSlot = extraArg as Instance | undefined;
			
			if (ritualSlot && ritualSlot.Parent && activeRituals.has(player)) {
				const ritualObj = ritualSlot.Parent;
				let currentProgress = (ritualObj.GetAttribute("Progress") as number) || 0;
				
				if (result === "Great") {
					currentProgress += 3;
					if (currentProgress > 100) currentProgress = 100;
					ritualObj.SetAttribute("Progress", currentProgress);
					print(`${player.Name} mendapat bonus progress (+3)!`);
				} else if (result === "Fail") {
					currentProgress -= 5;
					if (currentProgress < 0) currentProgress = 0;
					ritualObj.SetAttribute("Progress", currentProgress);
					print(`${player.Name} mendapat penalti progress (-5)!`);
					
					// Batalkan ritual
					activeRituals.delete(player);
					rootPart.Anchored = false;
					player.SetAttribute("IsRitualing", false);
					print(`${player.Name} gagal Skill Check, ritual terputus!`);
					
					// Beri efek stun
					StateManager.StunBaraya(player, 2);
				}
				// Jika "Good", tidak ada bonus atau penalti
			}
		} else if (action === "StopRitual") {
			if (activeRituals.has(player)) {
				activeRituals.delete(player);
				rootPart.Anchored = false;
				player.SetAttribute("IsRitualing", false);
				print(`${player.Name} berhenti ritual`);
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
	for (const [p, slot] of activeRituals) {
		const char = p.Character;
		const rootPart = char?.FindFirstChild("HumanoidRootPart") as Part | undefined;
		const ritualObj = slot.Parent;

		if (!char || !rootPart || !ritualObj) {
			activeRituals.delete(p);
			if (rootPart) rootPart.Anchored = false;
			continue;
		}

		const currentState = StateManager.GetState(p);
		if (
			currentState === "Knock" ||
			currentState === "Carried" ||
			currentState === "Hooked" ||
			currentState === "Dead"
		) {
			activeRituals.delete(p);
			rootPart.Anchored = false;
			p.SetAttribute("IsRitualing", false);
			continue;
		}

		const pos = slot.IsA("Attachment") ? slot.WorldPosition : (slot as BasePart).Position;
		const distance = rootPart.Position.sub(pos).Magnitude;
		if (distance > REPAIR_RANGE) {
			activeRituals.delete(p);
			rootPart.Anchored = false;
			p.SetAttribute("IsRitualing", false);
			continue;
		}

		let currentProgress = (ritualObj.GetAttribute("Progress") as number) || 0;
		if (currentProgress < 100) {
			currentProgress += REPAIR_SPEED * deltaTime;

			if (currentProgress >= 100) {
				currentProgress = 100;
				
				// Selesaikan ritual untuk semua pemain di ritualObj ini
				for (const [otherP, otherSlot] of activeRituals) {
					if (otherSlot.Parent === ritualObj) {
						activeRituals.delete(otherP);
						const otherRoot = otherP.Character?.FindFirstChild("HumanoidRootPart") as Part | undefined;
						if (otherRoot) otherRoot.Anchored = false;
						otherP.SetAttribute("IsRitualing", false);
					}
				}

				if (ritualObj.IsA("BasePart")) {
					ritualObj.BrickColor = new BrickColor("Bright yellow");
					ritualObj.Material = Enum.Material.Neon;
				}
				print("Satu Objek Ritual telah diselesaikan!");

				completedRituals += 1;
				if (completedRituals >= TARGET_RITUAL && !isGateOpen) {
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
			ritualObj.SetAttribute("Progress", currentProgress);
		}
	}
});

Workspace.ChildRemoved.Connect((child) => {
	// Di TS kita gunakan string.match untuk meniru pola pencarian di Lua
	if (child.Name.match("Map_")[0]) {
		completedRituals = 0;
		isGateOpen = false;
		for (const [p, _] of activeRituals) {
			const rootPart = p.Character?.FindFirstChild("HumanoidRootPart") as Part | undefined;
			if (rootPart) rootPart.Anchored = false;
			p.SetAttribute("IsRitualing", false);
		}
		activeRituals.clear();
	}
});