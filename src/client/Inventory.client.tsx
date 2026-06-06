import React, { useState, useEffect } from "@rbxts/react";
import { createRoot } from "@rbxts/react-roblox";
import { Players, ReplicatedStorage, HttpService } from "@rbxts/services";
import { CharacterData } from "shared/GameData/CharacterData";
import { ItemData } from "shared/GameData/ItemData";
import { PerkData } from "shared/GameData/PerkData";

const Shared = ReplicatedStorage.WaitForChild("TS") as Folder;
const Events = Shared.WaitForChild("Events") as Folder;
const BuyRequest = Events.WaitForChild("BuyRequest") as RemoteEvent;
const EquipRequest = Events.WaitForChild("EquipRequest") as RemoteEvent;

const CATEGORIES = ["Killer", "Item Baraya", "Perk Killer", "Perk Baraya"];

// Palet Modern / Monokrom
const COLORS = {
    bgApp: Color3.fromRGB(18, 18, 18),
    bgSidebar: Color3.fromRGB(24, 24, 24),
    bgCard: Color3.fromRGB(32, 32, 32),
    btnBase: Color3.fromRGB(42, 42, 42),
    btnActive: Color3.fromRGB(220, 220, 220),
    btnAction: Color3.fromRGB(255, 255, 255),
    textMain: Color3.fromRGB(245, 245, 245),
    textSub: Color3.fromRGB(160, 160, 160),
    textDark: Color3.fromRGB(20, 20, 20)
};

interface ItemProps {
    id: string;
    name: string;
    cost: number;
    type: string;
}

function MainUI() {
    const [activeShopTab, setActiveShopTab] = useState(CATEGORIES[0]);
    const [isShopVisible, setIsShopVisible] = useState(false);

    const [activeInvTab, setActiveInvTab] = useState(CATEGORIES[0]);
    const [isInvVisible, setIsInvVisible] = useState(false);

    const [teamName, setTeamName] = useState(Players.LocalPlayer.Team?.Name || "Arwah");
    const [uang, setUang] = useState(0);
    const [ownedJurig, setOwnedJurig] = useState<string[]>([]);

    useEffect(() => {
        const player = Players.LocalPlayer;

        // 1. Monitor Tim (Hanya tim Arwah yang dapat melihat UI ini)
        const teamConn = player.GetPropertyChangedSignal("Team").Connect(() => {
            const currentTeam = player.Team?.Name || "Arwah";
            setTeamName(currentTeam);
            if (currentTeam !== "Arwah") {
                setIsShopVisible(false);
                setIsInvVisible(false);
            }
        });

        // 2. Monitor Uang Pemain
        const leaderstats = player.WaitForChild("leaderstats") as Folder;
        const uangVal = leaderstats.WaitForChild("Uang") as IntValue;
        setUang(uangVal.Value);
        const uangConn = uangVal.GetPropertyChangedSignal("Value").Connect(() => {
            setUang(uangVal.Value);
        });

        // 3. Monitor Item Kepemilikan (Jurig)
        const updateOwned = () => {
            const ownedAttr = player.GetAttribute("OwnedJurig") as string;
            if (ownedAttr !== undefined) {
                const decoded = HttpService.JSONDecode(ownedAttr) as string[];
                setOwnedJurig(decoded);
            }
        };
        updateOwned();
        const attrConn = player.GetAttributeChangedSignal("OwnedJurig").Connect(updateOwned);

        return () => {
            teamConn.Disconnect();
            uangConn.Disconnect();
            attrConn.Disconnect();
        };
    }, []);

    if (teamName !== "Arwah") return <></>;

// Parsing data nyata
    let shopData: ItemProps[] = [];
    if (activeShopTab === "Killer") {
        for (const [id, data] of pairs(CharacterData)) {
            shopData.push({ id: id as string, name: data.Name, cost: data.Cost, type: "Character" });
        }
    } else if (activeShopTab === "Item Baraya") {
        for (const [id, data] of pairs(ItemData)) {
            shopData.push({ id: id as string, name: data.Name, cost: data.Cost, type: "Item" });
        }
    } else if (activeShopTab === "Perk Killer") {
        for (const [id, data] of pairs(PerkData.Jurig)) {
            shopData.push({ id: id as string, name: data.Name, cost: data.BaseCost, type: "PerkJurig" });
        }
    } else if (activeShopTab === "Perk Baraya") {
        for (const [id, data] of pairs(PerkData.Baraya)) {
            shopData.push({ id: id as string, name: data.Name, cost: data.BaseCost, type: "PerkBaraya" });
        }
    }

    let invData: ItemProps[] = [];
    if (activeInvTab === "Killer") {
        for (const [id, data] of pairs(CharacterData)) {
            if (ownedJurig.includes(id as string)) {
                invData.push({ id: id as string, name: data.Name, cost: 0, type: "Character" });
            }
        }
    }

    return (
        <screengui IgnoreGuiInset={true} ResetOnSpawn={false}>
            {/* HUD: Informasi Uang di Lobby */}
            {!isShopVisible && !isInvVisible && (
                <textlabel
                    Text={`Balance: ${uang}`}
                    Size={new UDim2(0, 140, 0, 30)}
                    Position={new UDim2(0, 20, 0.4, -40)}
                    BackgroundColor3={COLORS.bgApp}
                    TextColor3={COLORS.textMain}
                    Font={Enum.Font.GothamBold}
                    TextScaled={true}
                >
                    <uicorner CornerRadius={new UDim(0, 4)} />
                    <uitextsizeconstraint MaxTextSize={14} MinTextSize={10} />
                </textlabel>
            )}

            {!isShopVisible && !isInvVisible && (
                <textbutton
                    Text="STORE"
                    Size={new UDim2(0, 140, 0, 45)}
                    Position={new UDim2(0, 20, 0.4, 0)}
                    BackgroundColor3={COLORS.btnBase}
                    TextColor3={COLORS.textMain}
                    Font={Enum.Font.GothamMedium}
                    TextScaled={true}
                    Event={{
                        MouseButton1Click: () => {
                            setIsShopVisible(true);
                            setIsInvVisible(false);
                        },
                    }}
                >
                    <uicorner CornerRadius={new UDim(0, 4)} />
                    <uitextsizeconstraint MaxTextSize={16} MinTextSize={12} />
                </textbutton>
            )}

            {!isShopVisible && !isInvVisible && (
                <textbutton
                    Text="INVENTORY"
                    Size={new UDim2(0, 140, 0, 45)}
                    Position={new UDim2(0, 20, 0.4, 55)}
                    BackgroundColor3={COLORS.btnBase} 
                    TextColor3={COLORS.textMain}
                    Font={Enum.Font.GothamMedium}
                    TextScaled={true}
                    Event={{
                        MouseButton1Click: () => {
                            setIsInvVisible(true);
                            setIsShopVisible(false);
                        },
                    }}
                >
                    <uicorner CornerRadius={new UDim(0, 4)} />
                    <uitextsizeconstraint MaxTextSize={16} MinTextSize={12} />
                </textbutton>
            )}

            {/* ===================== SHOP ===================== */}
            {isShopVisible && (
                <>
                    <textbutton Size={new UDim2(1, 0, 1, 0)} BackgroundColor3={COLORS.bgApp} BackgroundTransparency={0.4} Text="" BorderSizePixel={0} ZIndex={1} Event={{ MouseButton1Click: () => setIsShopVisible(false) }} />

                    <frame Size={new UDim2(0.8, 0, 0.8, 0)} Position={new UDim2(0.1, 0, 0.1, 0)} BackgroundColor3={COLORS.bgApp} BorderSizePixel={0} ZIndex={2} Active={true}>
                        <uicorner CornerRadius={new UDim(0, 8)} />

                        <frame Size={new UDim2(0.25, 0, 1, 0)} BackgroundColor3={COLORS.bgSidebar} BorderSizePixel={0} ZIndex={3}>
                            <uicorner CornerRadius={new UDim(0, 8)} />
                            <uilistlayout SortOrder={Enum.SortOrder.LayoutOrder} Padding={new UDim(0.02, 0)} />
                            <uipadding PaddingTop={new UDim(0.05, 0)} PaddingLeft={new UDim(0.05, 0)} PaddingRight={new UDim(0.05, 0)} />
                            
                            <textlabel Text="STORE" Size={new UDim2(1, 0, 0.12, 0)} BackgroundTransparency={1} TextColor3={COLORS.textMain} Font={Enum.Font.GothamBold} TextScaled={true}>
                                <uitextsizeconstraint MaxTextSize={24} MinTextSize={14} />
                            </textlabel>

                            {CATEGORIES.map((category) => (
                                <textbutton
                                    key={`shop_${category}`}
                                    Text={category}
                                    Size={new UDim2(1, 0, 0.1, 0)}
                                    BackgroundColor3={activeShopTab === category ? COLORS.btnActive : COLORS.btnBase}
                                    TextColor3={activeShopTab === category ? COLORS.textDark : COLORS.textMain}
                                    Font={Enum.Font.GothamMedium}
                                    TextScaled={true}
                                    ZIndex={4}
                                    Event={{ MouseButton1Click: () => setActiveShopTab(category) }}
                                >
                                    <uicorner CornerRadius={new UDim(0, 4)} />
                                    <uitextsizeconstraint MaxTextSize={16} MinTextSize={10} />
                                </textbutton>
                            ))}
                        </frame>

                        <scrollingframe Size={new UDim2(0.75, -20, 1, -20)} Position={new UDim2(0.25, 10, 0, 10)} BackgroundTransparency={1} ScrollBarThickness={4} CanvasSize={new UDim2(0, 0, 2, 0)} ZIndex={3}>
                            <uigridlayout CellSize={new UDim2(0, 160, 0, 200)} CellPadding={new UDim2(0, 15, 0, 15)} SortOrder={Enum.SortOrder.LayoutOrder} />
                            
                            {shopData.map((item) => {
                                const isOwned = item.type === "Character" && ownedJurig.includes(item.id);
                                return (
                                <frame key={`shop_item_${item.id}`} BackgroundColor3={COLORS.bgCard} ZIndex={4}>
                                    <uicorner CornerRadius={new UDim(0, 6)} />
                                    <textlabel Text={item.name} Size={new UDim2(1, -10, 0.2, 0)} Position={new UDim2(0, 5, 0.55, 0)} BackgroundTransparency={1} TextColor3={COLORS.textMain} Font={Enum.Font.GothamMedium} TextScaled={true} ZIndex={5} />
                                    <textlabel Text={isOwned ? "Owned" : `${item.cost} CR`} Size={new UDim2(1, 0, 0.15, 0)} Position={new UDim2(0, 0, 0.8, 0)} BackgroundTransparency={1} TextColor3={COLORS.textSub} Font={Enum.Font.GothamBold} TextScaled={true} ZIndex={5} />
                                    
                                    {!isOwned && (
                                        <textbutton Text="Buy" Size={new UDim2(0.8, 0, 0.15, 0)} Position={new UDim2(0.1, 0, 0.1, 0)} BackgroundColor3={COLORS.btnAction} TextColor3={COLORS.textDark} Font={Enum.Font.GothamBold} TextScaled={true} ZIndex={5} Event={{ MouseButton1Click: () => BuyRequest.FireServer(item.type, item.id) }}>
                                            <uicorner CornerRadius={new UDim(0, 4)} />
                                        </textbutton>
                                    )}
                                </frame>
                                );
                            })}
                        </scrollingframe>
                    </frame>
                </>
            )}

            {/* ===================== INVENTORY ===================== */}
            {isInvVisible && (
                <>
                    <textbutton Size={new UDim2(1, 0, 1, 0)} BackgroundColor3={COLORS.bgApp} BackgroundTransparency={0.4} Text="" BorderSizePixel={0} ZIndex={1} Event={{ MouseButton1Click: () => setIsInvVisible(false) }} />

                    <frame Size={new UDim2(0.8, 0, 0.8, 0)} Position={new UDim2(0.1, 0, 0.1, 0)} BackgroundColor3={COLORS.bgApp} BorderSizePixel={0} ZIndex={2} Active={true}>
                        <uicorner CornerRadius={new UDim(0, 8)} />

                        <frame Size={new UDim2(0.25, 0, 1, 0)} BackgroundColor3={COLORS.bgSidebar} BorderSizePixel={0} ZIndex={3}>
                            <uicorner CornerRadius={new UDim(0, 8)} />
                            <uilistlayout SortOrder={Enum.SortOrder.LayoutOrder} Padding={new UDim(0.02, 0)} />
                            <uipadding PaddingTop={new UDim(0.05, 0)} PaddingLeft={new UDim(0.05, 0)} PaddingRight={new UDim(0.05, 0)} />
                            
                            <textlabel Text="INVENTORY" Size={new UDim2(1, 0, 0.12, 0)} BackgroundTransparency={1} TextColor3={COLORS.textMain} Font={Enum.Font.GothamBold} TextScaled={true}>
                                <uitextsizeconstraint MaxTextSize={24} MinTextSize={14} />
                            </textlabel>

                            {CATEGORIES.map((category) => (
                                <textbutton
                                    key={`inv_${category}`}
                                    Text={category}
                                    Size={new UDim2(1, 0, 0.1, 0)}
                                    BackgroundColor3={activeInvTab === category ? COLORS.btnActive : COLORS.btnBase}
                                    TextColor3={activeInvTab === category ? COLORS.textDark : COLORS.textMain}
                                    Font={Enum.Font.GothamMedium}
                                    TextScaled={true}
                                    ZIndex={4}
                                    Event={{ MouseButton1Click: () => setActiveInvTab(category) }}
                                >
                                    <uicorner CornerRadius={new UDim(0, 4)} />
                                    <uitextsizeconstraint MaxTextSize={16} MinTextSize={10} />
                                </textbutton>
                            ))}
                        </frame>

                        <scrollingframe Size={new UDim2(0.75, -20, 1, -20)} Position={new UDim2(0.25, 10, 0, 10)} BackgroundTransparency={1} ScrollBarThickness={4} CanvasSize={new UDim2(0, 0, 2, 0)} ZIndex={3}>
                            <uigridlayout CellSize={new UDim2(0, 160, 0, 200)} CellPadding={new UDim2(0, 15, 0, 15)} SortOrder={Enum.SortOrder.LayoutOrder} />
                            
                            {invData.map((item) => (
                                <frame key={`inv_item_${item.id}`} BackgroundColor3={COLORS.bgCard} ZIndex={4}>
                                    <uicorner CornerRadius={new UDim(0, 6)} />
                                    <textlabel Text={item.name} Size={new UDim2(1, -10, 0.2, 0)} Position={new UDim2(0, 5, 0.55, 0)} BackgroundTransparency={1} TextColor3={COLORS.textMain} Font={Enum.Font.GothamMedium} TextScaled={true} ZIndex={5} />
                                    <textbutton Text="Equip" Size={new UDim2(0.8, 0, 0.15, 0)} Position={new UDim2(0.1, 0, 0.8, 0)} BackgroundColor3={COLORS.btnAction} TextColor3={COLORS.textDark} Font={Enum.Font.GothamMedium} TextScaled={true} ZIndex={5} Event={{ MouseButton1Click: () => EquipRequest.FireServer(item.type, item.id) }}>
                                        <uicorner CornerRadius={new UDim(0, 4)} />
                                    </textbutton>
                                </frame>
                            ))}
                        </scrollingframe>
                    </frame>
                </>
            )}
        </screengui>
    );
}

const playerGui = Players.LocalPlayer.WaitForChild("PlayerGui");
const root = createRoot(playerGui);
root.render(<MainUI />);