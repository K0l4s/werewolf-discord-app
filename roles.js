const roleList = [
    {
        name: "Sói", description: "Bạn là Sói. Hãy cùng đồng bọn giết hết dân làng."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301"
    },
    {
        name: "Dân làng", description: "Bạn là Dân làng. Hãy cố gắng tìm ra Sói."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301"
    },
    {
        name: "Tiên tri", description: "Cách 2 đêm bạn có thể soi 1 người."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301"
    },
    {
        name: "Bảo vệ", description: "Bạn có thể bảo vệ 1 người mỗi đêm."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301"
    },
    {
        name: "Cupid", description: "Bạn có thể kết đôi 2 người."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301"
    },
    {
        name: "Thợ săn", description: "Bạn là thợ săn."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301"
    }
    ,
    {
        name: "Già làng", description: "Bạn là già làng."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301"
    },
    {
        name: "Phù thủy", description: "Bạn là già làng."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301"
    }
];

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}
function assignRoles(players) {
    const selectedRoles = [];

    const numPlayers = players.length;

    // Số sói = ~25% tổng số người chơi, tối thiểu 1
    const numWolves = Math.max(1, Math.floor(numPlayers / 4));
    for (let i = 0; i < numWolves; i++) {
        selectedRoles.push(roleList.find(r => r.name === "Sói"));
    }

    // 1 Tiên tri
    selectedRoles.push(roleList.find(r => r.name === "Tiên tri"));

    // 1 Bảo vệ
    selectedRoles.push(roleList.find(r => r.name === "Bảo vệ"));
    if (numPlayers > 4) {
        selectedRoles.push(roleList.find(r => r.name === "Cupid"));

        selectedRoles.push(roleList.find(r => r.name === "Thợ săn"));

        selectedRoles.push(roleList.find(r => r.name === "Già làng"));
    }
    // Còn lại là Dân làng
    const numVillagers = numPlayers - selectedRoles.length;
    for (let i = 0; i < numVillagers; i++) {
        selectedRoles.push(roleList.find(r => r.name === "Dân làng"));
    }

    shuffle(selectedRoles);

    const roleMap = new Map();
    for (let i = 0; i < players.length; i++) {
        roleMap.set(players[i], selectedRoles[i]);
    }

    return roleMap;
}

module.exports = {
    assignRoles
};
