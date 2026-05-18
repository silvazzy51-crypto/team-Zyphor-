const config = require("../config.json");

const joins = new Map();
let raid = new Map();

module.exports = (client) => {
  client.on("guildMemberAdd", async (member) => {
    const guildId = member.guild.id;
    const now = Date.now();

    if (!joins.has(guildId)) joins.set(guildId, []);
    if (!raid.has(guildId)) raid.set(guildId, false);

    const list = joins.get(guildId);

    list.push(now);

    const recent = list.filter(t => now - t < config.timeWindow);

    joins.set(guildId, recent);

    if (recent.length >= config.joinLimit && !raid.get(guildId)) {
      raid.set(guildId, true);

      const channel = member.guild.systemChannel;
      if (channel) channel.send("🚨 Possível raid detectado!");

      setTimeout(() => {
        raid.set(guildId, false);
      }, 30000);
    }

    if (raid.get(guildId)) {
      try {
        await member.kick("Anti-raid ativo");
      } catch {}
    }
  });
};
