export interface PerkInfo {
	Name: string;
	Description: string;
	MaxLevel: number;
	BaseCost: number;
}

export interface PerkCategory {
	[key: string]: PerkInfo;
}

export const PerkData: { Baraya: PerkCategory; Jurig: PerkCategory } = {
	// PERKS KHUSUS BARAYA
	Baraya: {
		LariCepat: {
			Name: "Adrenalin Pelari",
			Description: "Setelah terkena hit, lari lebih cepat selama beberapa detik.",
			MaxLevel: 3,
			BaseCost: 300, // Harga beli level 1
		},
		DokterPribadi: {
			Name: "Dokter Pribadi",
			Description: "Bisa menyembuhkan diri sendiri tanpa Medkit (tapi lebih lambat).",
			MaxLevel: 3,
			BaseCost: 500,
		},
		KucingGarong: {
			Name: "Langkah Kucing",
			Description: "Lompat jendela (Vault) tidak menimbulkan suara berisik.",
			MaxLevel: 3,
			BaseCost: 400,
		},
	},

	// PERKS KHUSUS JURIG
	Jurig: {
		MataBatin: {
			Name: "Mata Batin",
			Description: "Bisa melihat jejak kaki Baraya sedikit lebih lama.",
			MaxLevel: 3,
			BaseCost: 400,
		},
		KekuatanGelap: {
			Name: "Genggaman Maut",
			Description: "Baraya butuh waktu lebih lama untuk berontak saat digendong.",
			MaxLevel: 3,
			BaseCost: 500,
		},
		PecahBelah: {
			Name: "Niat Jahat",
			Description: "Memukul Generator akan merusak progress perbaikannya.",
			MaxLevel: 3,
			BaseCost: 600,
		},
	},
};