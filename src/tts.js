const { Client, GatewayIntentBits } = require("discord.js");
const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  NoSubscriberBehavior, 
  getVoiceConnection 
} = require("@discordjs/voice");
const googleTTS = require("google-tts-api");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
});

// Lưu connections và players cho nhiều kênh
const connections = new Map();

client.on("messageCreate", async (msg) => {
  if (!msg.guild) return;
  if (msg.author.bot) return;

  const args = msg.content.split(" ");
  const cmd = args.shift()?.toLowerCase();

  if (cmd === "!join") {
    const channel = msg.member?.voice.channel;
    if (!channel) return msg.reply("Vào voice channel trước đã!");

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });

    connection.subscribe(player);

    connections.set(channel.id, { connection, player });
    msg.reply(`✅ Đã tham gia voice channel: ${channel.name}`);
  }

  if (cmd === "!say") {
    const text = args.join(" ");
    if (!text) return msg.reply("Nhập nội dung cần đọc!");

    const channel = msg.member?.voice.channel;
    if (!channel) return msg.reply("Bạn chưa ở voice channel!");

    const connObj = connections.get(channel.id);
    if (!connObj) return msg.reply("Bot chưa join channel này!");

    // Convert text -> audio
    const url = googleTTS.getAudioUrl(text, {
      lang: "vi",
      slow: false,
      host: "https://translate.google.com",
    });

    const resource = createAudioResource(url);
    connObj.player.play(resource);

    msg.reply(`📢 Đang đọc: "${text}"`);
  }

  if (cmd === "!leave") {
    const channel = msg.member?.voice.channel;
    if (!channel) return msg.reply("Bạn chưa ở voice channel!");

    const connObj = connections.get(channel.id);
    if (!connObj) return msg.reply("Bot chưa join channel này!");

    connObj.connection.destroy();
    connections.delete(channel.id);

    msg.reply(`👋 Rời khỏi channel: ${channel.name}`);
  }
});
const { Client, GatewayIntentBits } = require("discord.js");
const { 
  joinVoiceChannel, 
  createAudioPlayer, 
  createAudioResource, 
  NoSubscriberBehavior, 
  getVoiceConnection 
} = require("@discordjs/voice");
const googleTTS = require("google-tts-api");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
});

// Lưu connections và players cho nhiều kênh
const connections = new Map();

client.on("messageCreate", async (msg) => {
  if (!msg.guild) return;
  if (msg.author.bot) return;

  const args = msg.content.split(" ");
  const cmd = args.shift()?.toLowerCase();

  if (cmd === "!join") {
    const channel = msg.member?.voice.channel;
    if (!channel) return msg.reply("Vào voice channel trước đã!");

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
    });

    const player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });

    connection.subscribe(player);

    connections.set(channel.id, { connection, player });
    msg.reply(`✅ Đã tham gia voice channel: ${channel.name}`);
  }

  if (cmd === "!say") {
    const text = args.join(" ");
    if (!text) return msg.reply("Nhập nội dung cần đọc!");

    const channel = msg.member?.voice.channel;
    if (!channel) return msg.reply("Bạn chưa ở voice channel!");

    const connObj = connections.get(channel.id);
    if (!connObj) return msg.reply("Bot chưa join channel này!");

    // Convert text -> audio
    const url = googleTTS.getAudioUrl(text, {
      lang: "vi",
      slow: false,
      host: "https://translate.google.com",
    });

    const resource = createAudioResource(url);
    connObj.player.play(resource);

    msg.reply(`📢 Đang đọc: "${text}"`);
  }

  if (cmd === "!leave") {
    const channel = msg.member?.voice.channel;
    if (!channel) return msg.reply("Bạn chưa ở voice channel!");

    const connObj = connections.get(channel.id);
    if (!connObj) return msg.reply("Bot chưa join channel này!");

    connObj.connection.destroy();
    connections.delete(channel.id);

    msg.reply(`👋 Rời khỏi channel: ${channel.name}`);
  }
});

client.login("YOUR_BOT_TOKEN");

