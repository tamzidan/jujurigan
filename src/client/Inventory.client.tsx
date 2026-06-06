import React, { useState } from "@rbxts/react";
import { createRoot } from "@rbxts/react-roblox";
import { Players } from "@rbxts/services";

// Kategori item yang digunakan bersama
const CATEGORIES = [
    "Killer", "Skin Killer", "Perk Killer", 
    "Item Baraya", "Perk Baraya", "Emote"
];

function MainUI() {
    // State untuk Toko
    const [activeShopTab, setActiveShopTab] = useState(CATEGORIES[0]);
    const [isShopVisible, setIsShopVisible] = useState(false);

    // State untuk Inventory
    const [activeInvTab, setActiveInvTab] = useState(CATEGORIES[0]);
    const [isInvVisible, setIsInvVisible] = useState(false);

    return (
        <screengui IgnoreGuiInset={true} ResetOnSpawn={false}>
            {/* TOMBOL BUKA TOKO (Di Tengah-Kiri Layar) */}
            {!isShopVisible && !isInvVisible && (
                <textbutton
                    Text="Buka Toko"
                    Size={new UDim2(0, 140, 0, 45)}
                    Position={new UDim2(0, 20, 0.4, 0)}
                    BackgroundColor3={Color3.fromRGB(200, 30, 30)}
                    TextColor3={Color3.fromRGB(255, 255, 255)}
                    Font={Enum.Font.GothamBold}
                    TextScaled={true}
                    Event={{
                        MouseButton1Click: () => {
                            setIsShopVisible(true);
                            setIsInvVisible(false); // Tutup inventory jika terbuka
                        },
                    }}
                >
                    <uicorner CornerRadius={new UDim(0, 8)} />
                    <uitextsizeconstraint MaxTextSize={18} MinTextSize={12} />
                </textbutton>
            )}

            {/* TOMBOL BUKA INVENTORY (Di Bawah Tombol Toko) */}
            {!isShopVisible && !isInvVisible && (
                <textbutton
                    Text="Buka Inventory"
                    Size={new UDim2(0, 140, 0, 45)}
                    Position={new UDim2(0, 20, 0.4, 55)}
                    BackgroundColor3={Color3.fromRGB(30, 100, 200)} 
                    TextColor3={Color3.fromRGB(255, 255, 255)}
                    Font={Enum.Font.GothamBold}
                    TextScaled={true}
                    Event={{
                        MouseButton1Click: () => {
                            setIsInvVisible(true);
                            setIsShopVisible(false); // Tutup toko jika terbuka
                        },
                    }}
                >
                    <uicorner CornerRadius={new UDim(0, 8)} />
                    <uitextsizeconstraint MaxTextSize={16} MinTextSize={12} />
                </textbutton>
            )}

            {/* ===================== WINDOW SHOP ===================== */}
            {isShopVisible && (
                <>
                    {/* Background Gelap Toko */}
                    <textbutton
                        Size={new UDim2(1, 0, 1, 0)}
                        BackgroundColor3={Color3.fromRGB(0, 0, 0)}
                        BackgroundTransparency={0.6}
                        Text=""
                        BorderSizePixel={0}
                        ZIndex={1}
                        Event={{ MouseButton1Click: () => setIsShopVisible(false) }}
                    />

                    {/* Frame Utama Toko */}
                    <frame Size={new UDim2(0.8, 0, 0.8, 0)} Position={new UDim2(0.1, 0, 0.1, 0)} BackgroundColor3={Color3.fromRGB(20, 20, 20)} BorderSizePixel={0} ZIndex={2} Active={true}>
                        <uicorner CornerRadius={new UDim(0, 12)} />

                        {/* Sidebar Toko */}
                        <frame Size={new UDim2(0.25, 0, 1, 0)} BackgroundColor3={Color3.fromRGB(15, 15, 15)} BorderSizePixel={0} ZIndex={3}>
                            <uicorner CornerRadius={new UDim(0, 12)} />
                            <uilistlayout SortOrder={Enum.SortOrder.LayoutOrder} Padding={new UDim(0.02, 0)} />
                            <uipadding PaddingTop={new UDim(0.05, 0)} PaddingLeft={new UDim(0.05, 0)} PaddingRight={new UDim(0.05, 0)} />
                            
                            <textlabel Text="TOKO RITUAL" Size={new UDim2(1, 0, 0.12, 0)} BackgroundTransparency={1} TextColor3={Color3.fromRGB(200, 30, 30)} Font={Enum.Font.Creepster} TextScaled={true}>
                                <uitextsizeconstraint MaxTextSize={40} MinTextSize={14} />
                            </textlabel>

                            {CATEGORIES.map((category) => (
                                <textbutton
                                    key={`shop_${category}`}
                                    Text={category}
                                    Size={new UDim2(1, 0, 0.1, 0)}
                                    BackgroundColor3={activeShopTab === category ? Color3.fromRGB(80, 20, 20) : Color3.fromRGB(35, 35, 35)}
                                    TextColor3={Color3.fromRGB(255, 255, 255)}
                                    Font={Enum.Font.GothamBold}
                                    TextScaled={true}
                                    ZIndex={4}
                                    Event={{ MouseButton1Click: () => setActiveShopTab(category) }}
                                >
                                    <uicorner CornerRadius={new UDim(0, 6)} />
                                    <uitextsizeconstraint MaxTextSize={22} MinTextSize={10} />
                                </textbutton>
                            ))}
                        </frame>

                        {/* Konten List Toko */}
                        <scrollingframe Size={new UDim2(0.75, -20, 1, -20)} Position={new UDim2(0.25, 10, 0, 10)} BackgroundTransparency={1} ScrollBarThickness={6} CanvasSize={new UDim2(0, 0, 2, 0)} ZIndex={3}>
                            <uigridlayout CellSize={new UDim2(0, 160, 0, 200)} CellPadding={new UDim2(0, 15, 0, 15)} SortOrder={Enum.SortOrder.LayoutOrder} />
                            
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                                <frame key={`shop_item_${i}`} BackgroundColor3={Color3.fromRGB(40, 40, 40)} ZIndex={4}>
                                    <uicorner CornerRadius={new UDim(0, 8)} />
                                    <textlabel Text={`${activeShopTab} ${i}`} Size={new UDim2(1, -10, 0.2, 0)} Position={new UDim2(0, 5, 0.55, 0)} BackgroundTransparency={1} TextColor3={Color3.fromRGB(255, 255, 255)} Font={Enum.Font.GothamMedium} TextScaled={true} ZIndex={5} />
                                    <textlabel Text="500 Ritual Points" Size={new UDim2(1, 0, 0.15, 0)} Position={new UDim2(0, 0, 0.8, 0)} BackgroundTransparency={1} TextColor3={Color3.fromRGB(255, 180, 50)} Font={Enum.Font.GothamBold} TextScaled={true} ZIndex={5} />
                                </frame>
                            ))}
                        </scrollingframe>

                        {/* Tombol X Toko */}
                        <textbutton Text="X" Size={new UDim2(0, 35, 0, 35)} Position={new UDim2(1, -50, 0, 15)} BackgroundColor3={Color3.fromRGB(220, 50, 50)} TextColor3={Color3.fromRGB(255, 255, 255)} Font={Enum.Font.GothamBold} TextSize={20} ZIndex={5} Event={{ MouseButton1Click: () => setIsShopVisible(false) }}>
                            <uicorner CornerRadius={new UDim(1, 0)} />
                        </textbutton>
                    </frame>
                </>
            )}

            {/* ===================== WINDOW INVENTORY ===================== */}
            {isInvVisible && (
                <>
                    {/* Background Gelap Inventory */}
                    <textbutton
                        Size={new UDim2(1, 0, 1, 0)}
                        BackgroundColor3={Color3.fromRGB(0, 0, 0)}
                        BackgroundTransparency={0.6}
                        Text=""
                        BorderSizePixel={0}
                        ZIndex={1}
                        Event={{ MouseButton1Click: () => setIsInvVisible(false) }}
                    />

                    {/* Frame Utama Inventory */}
                    <frame Size={new UDim2(0.8, 0, 0.8, 0)} Position={new UDim2(0.1, 0, 0.1, 0)} BackgroundColor3={Color3.fromRGB(20, 20, 20)} BorderSizePixel={0} ZIndex={2} Active={true}>
                        <uicorner CornerRadius={new UDim(0, 12)} />

                        {/* Sidebar Inventory */}
                        <frame Size={new UDim2(0.25, 0, 1, 0)} BackgroundColor3={Color3.fromRGB(15, 15, 15)} BorderSizePixel={0} ZIndex={3}>
                            <uicorner CornerRadius={new UDim(0, 12)} />
                            <uilistlayout SortOrder={Enum.SortOrder.LayoutOrder} Padding={new UDim(0.02, 0)} />
                            <uipadding PaddingTop={new UDim(0.05, 0)} PaddingLeft={new UDim(0.05, 0)} PaddingRight={new UDim(0.05, 0)} />
                            
                            <textlabel Text="INVENTORY" Size={new UDim2(1, 0, 0.12, 0)} BackgroundTransparency={1} TextColor3={Color3.fromRGB(200, 200, 200)} Font={Enum.Font.Creepster} TextScaled={true}>
                                <uitextsizeconstraint MaxTextSize={40} MinTextSize={14} />
                            </textlabel>

                            {CATEGORIES.map((category) => (
                                <textbutton
                                    key={`inv_${category}`}
                                    Text={category}
                                    Size={new UDim2(1, 0, 0.1, 0)}
                                    BackgroundColor3={activeInvTab === category ? Color3.fromRGB(40, 80, 150) : Color3.fromRGB(35, 35, 35)}
                                    TextColor3={Color3.fromRGB(255, 255, 255)}
                                    Font={Enum.Font.GothamBold}
                                    TextScaled={true}
                                    ZIndex={4}
                                    Event={{ MouseButton1Click: () => setActiveInvTab(category) }}
                                >
                                    <uicorner CornerRadius={new UDim(0, 6)} />
                                    <uitextsizeconstraint MaxTextSize={22} MinTextSize={10} />
                                </textbutton>
                            ))}
                        </frame>

                        {/* Konten List Inventory */}
                        <scrollingframe Size={new UDim2(0.75, -20, 1, -20)} Position={new UDim2(0.25, 10, 0, 10)} BackgroundTransparency={1} ScrollBarThickness={6} CanvasSize={new UDim2(0, 0, 2, 0)} ZIndex={3}>
                            <uigridlayout CellSize={new UDim2(0, 160, 0, 200)} CellPadding={new UDim2(0, 15, 0, 15)} SortOrder={Enum.SortOrder.LayoutOrder} />
                            
                            {[1, 2, 3, 4].map((i) => (
                                <frame key={`inv_item_${i}`} BackgroundColor3={Color3.fromRGB(40, 40, 40)} ZIndex={4}>
                                    <uicorner CornerRadius={new UDim(0, 8)} />
                                    <textlabel Text={`${activeInvTab} Dimiliki ${i}`} Size={new UDim2(1, -10, 0.2, 0)} Position={new UDim2(0, 5, 0.55, 0)} BackgroundTransparency={1} TextColor3={Color3.fromRGB(255, 255, 255)} Font={Enum.Font.GothamMedium} TextScaled={true} ZIndex={5} />
                                    <textbutton Text="Gunakan" Size={new UDim2(0.8, 0, 0.15, 0)} Position={new UDim2(0.1, 0, 0.8, 0)} BackgroundColor3={Color3.fromRGB(50, 150, 50)} TextColor3={Color3.fromRGB(255, 255, 255)} Font={Enum.Font.GothamBold} TextScaled={true} ZIndex={5} Event={{ MouseButton1Click: () => print(`Menggunakan ${activeInvTab} ${i}`) }}>
                                        <uicorner CornerRadius={new UDim(0, 4)} />
                                    </textbutton>
                                </frame>
                            ))}
                        </scrollingframe>

                        {/* Tombol X Inventory */}
                        <textbutton Text="X" Size={new UDim2(0, 35, 0, 35)} Position={new UDim2(1, -50, 0, 15)} BackgroundColor3={Color3.fromRGB(220, 50, 50)} TextColor3={Color3.fromRGB(255, 255, 255)} Font={Enum.Font.GothamBold} TextSize={20} ZIndex={5} Event={{ MouseButton1Click: () => setIsInvVisible(false) }}>
                            <uicorner CornerRadius={new UDim(1, 0)} />
                        </textbutton>
                    </frame>
                </>
            )}
        </screengui>
    );
}

const playerGui = Players.LocalPlayer.WaitForChild("PlayerGui");
const root = createRoot(playerGui);
root.render(<MainUI />);