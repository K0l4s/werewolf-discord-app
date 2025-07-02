const roleList = [
    {
        name: "Sói", description: "Bạn là Sói. Hãy cùng đồng bọn giết hết dân làng."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301",
        team: 1,
        isAction: true
    },
    {
        name: "Dân làng", description: "Bạn là Dân làng. Hãy cố gắng tìm ra Sói."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301",
        team: 2,
        isAction: false
    },
    {
        name: "Tiên tri", description: "Cách 2 đêm bạn có thể soi 1 người."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301",
        team: 2,
        isAction: true
    },
    {
        name: "Bảo vệ", description: "Bạn có thể bảo vệ 1 người mỗi đêm."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301",
        team: 2,
        isAction: true
    },
    {
        name: "Cupid", description: "Bạn có thể kết đôi 2 người. Nếu 1 trong 2 người trong đôi tình nhân của bạn chết thì người còn lại sẽ bi lụy vì tình mà chết theo."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301",
        team: 2,
        isAction: true
    },
    {
        name: "Phù thủy", description: "Bạn có 2 lọ thuốc dùng để cứu người hoặc giết người. Bạn chỉ được dùng mỗi lọ 01 lần duy nhất."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301",
        team: 2
    },
    {
        name: "Thợ săn", description: "Bạn là thợ săn. Bạn được phép ngắm bắn 01 người chơi mỗi đêm. Khi bạn chết, đối phương sẽ chết theo. Nếu đối phương chết thì bạn không sao cả."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301",
        team: 2,
        isAction: true
    }
    ,
    {
        name: "Già làng", description: "Bạn là già làng. Bạn có 02 mạng, khi bạn chết đi, dân làng sẽ bị mất toàn bộ chức năng trừ thợ săn."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301",
        team: 2,
        isAction: true
    },
    {
        name: "Kẻ điên", description: "Bạn thuộc phe thứ 3, hãy chiến đấu và sống sót đến cuối cùng khi còn 01 dân và bạn thì bạn chiến thắng."
        , image: "https://tomwoodfantasyart.com/cdn/shop/products/TW007AP-Werewolf_1024x1024.jpg?v=1502938301",
        team: 3,
        isAction: false
    },
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
        selectedRoles.push(roleList.find(r => r.name === "Phù thủy"))

    } else if (numPlayers > 5) {
        selectedRoles.push(roleList.find(r => r.name === "Thợ săn"));

    } else if (numPlayers > 6) {
        selectedRoles.push(roleList.find(r => r.name === "Già làng"));
    } else {
        selectedRoles.push(roleList.find(r => r.name === "Kẻ điên"));
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
