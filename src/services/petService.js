const Pet = require("../models/Pet");
const ServerPet = require("../models/ServerPet");

class PetService {
    static async getServerPet(guildId) {
        return await ServerPet.findOne({ guildId }).populate('pet');
    }
    static async createServerPet(guildId) {
        const existing = await ServerPet.findOne({ guildId });
        if (existing) throw new Error("Server pet **already exists**");

        try {
            // Lấy tất cả pet có sẵn (không yêu cầu pet trước)
            const availablePets = await Pet.find({
                prevPetRequirement: { $in: [null, undefined] }
            });

            if (availablePets.length === 0) {
                throw new Error("Không có pet nào khả dụng trong database");
            }

            // Chọn ngẫu nhiên một pet
            const randomIndex = Math.floor(Math.random() * availablePets.length);
            const randomPet = availablePets[randomIndex];

            // Tạo tên ngẫu nhiên thú vị dựa trên type
            const petNames = {
                'Dog': ['Buddy', 'Max', 'Charlie', 'Cooper', 'Rocky'],
                'Cat': ['Luna', 'Bella', 'Kitty', 'Lucy', 'Nala'],
                'Dragon': ['Draco', 'Smaug', 'Toothless', 'Spyro', 'Drogon'],
                'Rabbit': ['Bunny', 'Thumper', 'Coco', 'Oreo', 'Snowball']
            };

            const defaultName = randomPet.type in petNames
                ? petNames[randomPet.type][Math.floor(Math.random() * petNames[randomPet.type].length)]
                : randomPet.type;

            // Tạo server pet mới
            const serverPet = new ServerPet({
                guildId,
                pet: randomPet._id,
                name: defaultName,
                hunger: randomPet.hungerStats || 100,
                happiness: randomPet.happinessStats || 100
            });

            await serverPet.save();

            // Populate thông tin pet
            const populatedServerPet = await ServerPet.findById(serverPet._id)
                .populate('pet');

            console.log(`✅ Created server pet for guild ${guildId}: ${populatedServerPet.name} (${populatedServerPet.pet.type})`);

            return populatedServerPet;

        } catch (error) {
            console.error('Error creating server pet:', error);
            throw new Error(`Không thể tạo server pet: ${error.message}`);
        }
    }
    // admin create new pet
    static async createPet(petType = "random") {
        // Danh sách các loại pet mẫu
        const petTemplates = {
            dog: {
                image: "https://media.baamboozle.com/uploads/images/107124/1599414911_113526",
                lvlRequirement: 100,
                hungerStats: 20,
                happinessStats: 20,
                price: 500,
                type: "Dog",
                luckyBoost: 5,
                prevPetRequirement: null
            },
            cat: {
                image: "https://assets.dochipo.com/editor/animations/cat/7f35e703-ad26-45cd-8f4f-62da09bb22e4.gif",
                lvlRequirement: 150,
                hungerStats: 25,
                happinessStats: 18,
                price: 700,
                type: "Cat",
                luckyBoost: 7,
                prevPetRequirement: null
            },
            dragon: {
                image: "https://giffiles.alphacoders.com/247/24723.gif",
                lvlRequirement: 300,
                hungerStats: 30,
                happinessStats: 15,
                price: 1500,
                type: "Dragon",
                luckyBoost: 15,
                prevPetRequirement: null
            },
            rabbit: {
                image: "https://media4.giphy.com/media/v1.Y2lkPTZjMDliOTUyMGx6cjRqY3lzamE2aWsyZDBoOXgwOHB4cWh5eXdxaDVxZHgxMjd4eCZlcD12MV9zdGlja2Vyc19zZWFyY2gmY3Q9cw/AaJsk7LhSjM3uiPLyd/giphy.gif",
                lvlRequirement: 80,
                hungerStats: 15,
                happinessStats: 25,
                price: 300,
                type: "Rabbit",
                luckyBoost: 3,
                prevPetRequirement: null
            }
        };

        // Chọn pet template
        let petData;
        if (petType === "random") {
            // Chọn ngẫu nhiên một pet
            const types = Object.keys(petTemplates);
            const randomType = types[Math.floor(Math.random() * types.length)];
            petData = petTemplates[randomType];
        } else if (petTemplates[petType.toLowerCase()]) {
            // Chọn pet cụ thể
            petData = petTemplates[petType.toLowerCase()];
        } else {
            // Mặc định là dog nếu type không hợp lệ
            petData = petTemplates.dog;
        }

        try {
            const pet = new Pet(petData);
            await pet.save();

            console.log(`✅ Đã tạo pet ${pet.type} thành công!`);
            console.log(`📊 ID: ${pet._id}`);
            console.log(`🎲 Lucky Boost: ${pet.luckyBoost}`);
            console.log(`💰 Price: ${pet.price}`);

            return pet;
        } catch (error) {
            console.error("❌ Lỗi khi tạo pet:", error);
            throw new Error("Không thể tạo pet");
        }
    }
}

module.exports = PetService;