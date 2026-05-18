const config = require("../config.json");

const joins = new Map();
let raidMode = false;

module.exports = (client) => {
  client.on("guildMemberAdd", async (member) => {
    const guildId = member.guild.id;
    const now = Date.now();

    if (!joins.has(guildId)) joins.set(guildId, []);

    const times = joins.get(guildId);

    times.push(now);

    const recent = times.filter(t => now - t < config.timeWindow);

    joins.set(guildId, recent);

    if (recent.length >= config.joinLimit && !raidMode) {
      raidMode = true;

      const channel = member.guild.systemChannel;
      if (channel) channel.send("🚨 RAID DETECTADO!");

      setTimeout(() => {
        raidMode = false;
      }, 30000);
    }

    if (raidMode) {
      try {
        await member.kick("Anti-raid ativo");
      } catch {}
    }
  });
};
