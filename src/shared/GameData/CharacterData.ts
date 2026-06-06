export interface CharacterInfo {
	Name: string;
	Cost: number;
	PassiveSkill: string;
	ActiveSkill1: string;
	ActiveSkill2: string;
}

export const CharacterData: Record<string, CharacterInfo> = {
	JurigDefault: {
		Name: "Sang Algojo",
		Cost: 0,
		PassiveSkill: "Jejak Darah",
		ActiveSkill1: "Teriakan Maut",
		ActiveSkill2: "Lari Kesetanan",
	},
	Kuntilanak: {
		Name: "Kuntilanak Merah",
		Cost: 2500,
		PassiveSkill: "Melayang",
		ActiveSkill1: "Tawa Nyaring",
		ActiveSkill2: "Teleportasi",
	},
	Pocong: {
		Name: "Pocong Mumun",
		Cost: 2000,
		PassiveSkill: "Lompat Jauh",
		ActiveSkill1: "Semburan Tanah",
		ActiveSkill2: "Ikat Pocong",
	},
};