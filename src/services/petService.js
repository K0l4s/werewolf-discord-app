const Inventory = require("../models/Inventory");
const Pet = require("../models/Pet");
const Item = require("../models/Item")
const ServerPet = require("../models/ServerPet");
const ItemService = require("./itemService");
const { ITEM_TYPE } = require("../config/constants");
const FoodBuff = require("../models/FoodBuff");

class PetService {
    static async getServerPet(guildId) {
        try {
            let serverPet = await ServerPet.findOne({ guildId }).populate('pet');

            if (!serverPet) {
                return null;
            }

            // Tính toán lại stats
            const now = new Date();

            // Tính toán độ đói dựa trên lastFed
            const lastFed = new Date(serverPet.lastFed);
            const minutesSinceLastFed = Math.floor((now - lastFed) / (1000 * 60));
            const hungerDecrease = Math.floor(minutesSinceLastFed / 15); // Mỗi 15 phút giảm 1 độ đói
            serverPet.hunger = Math.max(0, serverPet.hunger - hungerDecrease);

            // Tính toán độ vui vẻ dựa trên lastPlayed
            const lastPlayed = new Date(serverPet.lastPlayed);
            const minutesSinceLastPlayed = Math.floor((now - lastPlayed) / (1000 * 60));
            const happinessDecrease = Math.floor(minutesSinceLastPlayed / 10); // Mỗi 10 phút giảm 1 độ vui vẻ
            serverPet.happiness = Math.max(0, serverPet.happiness - happinessDecrease);

            // Cập nhật thời gian cuối cùng nếu có thay đổi
            if (hungerDecrease > 0 || happinessDecrease > 0) {
                await ServerPet.findByIdAndUpdate(serverPet._id, {
                    hunger: serverPet.hunger,
                    happiness: serverPet.happiness,
                    lastFed: hungerDecrease > 0 ? now : serverPet.lastFed,
                    lastPlayed: happinessDecrease > 0 ? now : serverPet.lastPlayed
                });
            }

            return serverPet;
        } catch (error) {
            console.error('Error getting server pet:', error);
            return null;
        }
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

    static async feedPet(guildId, itemRef, userId) {
        try {
            // Lấy thông tin server pet
            const serverPet = await ServerPet.findOne({ guildId }).populate('pet');
            if (!serverPet) {
                throw new Error("Server chưa có pet nào!");
            }

            // Kiểm tra item có tồn tại và là pet food không
            // const item = await Item.findById(itemId).populate('foodBuff');
            const item = await ItemService.getItemByRef(itemRef)
            if (!item) {
                throw new Error("Vật phẩm không tồn tại!");
            }

            if (item.type !== ITEM_TYPE.PET_FOOD) {
                throw new Error("Vật phẩm này không phải là thức ăn cho pet!");
            }
            // console.log(item)
            // Kiểm tra người dùng có item này và số lượng đủ không
            const userItem = await Inventory.findOne({ userId, item: item._id });
            // console.log(userItem)
            if (!userItem || userItem.quantity < 1) {
                throw new Error("Bạn không có vật phẩm này trong túi đồ!");
            }

            // Kiểm tra food buff
            // if (!item.foodBuff) {
            //     throw new Error("Vật phẩm này không có hiệu ứng!");
            // }

            // const foodBuff = item.foodBuff || 0;
            // const createFood = await FoodBuff.create({
            //     item:item._id,
            //     petExpEarn:20,
            //     hungerBuff:20,
            //     happinessBuff:20,
            //     luckyBuff:20
            // })
            // console.log(createFood)
            const foodBuff = await FoodBuff.findOne({ item: item._id })
            console.log(foodBuff)
            if (!foodBuff)
                throw new Error("Can't found effect! Can't feed this food")
            // Tính toán stats mới
            let newHunger = Math.min(serverPet.pet.hungerStats, serverPet.hunger + foodBuff.hungerBuff);
            // if (newHunger > serverPet.pet.hungerStats)
            //     newHunger = serverPet.pet.hungerStats
            const newHappiness = Math.min(serverPet.pet.hungerStats, serverPet.happiness + foodBuff.happinessBuff);
            // if (newHappiness > serverPet.pet.happinessStats)
            //     newHunger = serverPet.pet.happinessStats
            const newExp = serverPet.exp + (foodBuff.petExpEarn || 0);

            // Kiểm tra level up
            let newLevel = serverPet.lvl;
            let remainingExp = newExp;
            const expRequired = serverPet.pet.expStats * newLevel;

            if (newExp >= expRequired) {
                newLevel += 1;
                remainingExp = newExp - expRequired;
                // Có thể thêm logic thông báo level up ở đây
            }

            // Cập nhật server pet
            const updatedPet = await ServerPet.findByIdAndUpdate(
                serverPet._id,
                {
                    hunger: newHunger,
                    happiness: newHappiness,
                    exp: remainingExp,
                    lvl: newLevel,
                    lastFed: new Date()
                },
                { new: true }
            ).populate('pet');

            // Giảm số lượng item trong inventory
            if (userItem.quantity === 1) {
                // Nếu chỉ còn 1 thì xóa luôn document
                await Inventory.findByIdAndDelete(userItem._id);
            } else {
                // Ngược lại giảm số lượng
                await Inventory.findByIdAndUpdate(
                    userItem._id,
                    { $inc: { quantity: -1 } }
                );
            }

            return {
                success: true,
                pet: updatedPet,
                foodBuff: foodBuff,
                levelUp: newLevel > serverPet.lvl,
                oldLevel: serverPet.lvl,
                newLevel: newLevel,
                itemUsed: item
            };

        } catch (error) {
            console.error('Error feeding pet:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = PetService;