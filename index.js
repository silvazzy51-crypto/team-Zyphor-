// 📦 SISTEMA AUTO-INSTALÁVEL
try {
    require('unidecode');
} catch (e) {
    console.log('[SISTEMA] Instalando unidecode...');
    require('child_process').execSync('npm install unidecode');
}

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const unidecode = require('unidecode');

const TOKEN = process.env.DISCORD_TOKEN;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

const assinaturasGolpe = ['org', 'lideranca', 'apgratis', 'gratis', 'vagas', 'recrutamento'];
const servidoresAutorizados = new Set(['ID_DO_SEU_SERVIDOR_PRINCIPAL']);

function checarSeEhInvasor(texto) {
    if (!texto) return false;
    const textoLimpo = unidecode(texto).toLowerCase().replace(/\s+/g, '');
    return assinaturasGolpe.some(termo => textoLimpo.includes(termo));
}

async function aplicarBanimentoGlobal(userId, motivo) {
    for (const guild of client.guilds.cache.values()) {
        try { await guild.members.ban(userId, { reason: `Zyphor Security: ${motivo}` }); } catch (e) {}
    }
}

client.on('guildCreate', async (guild) => {
    if (!servidoresAutorizados.has(guild.id)) {
        try {
            const canal = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
            if (canal) await canal.send(`<:erro:1508472500495974600> **Zyphor Security v3** é privado.`);
        } catch (e) {}
        await guild.leave(); 
    }
});

client.on('guildMemberAdd', async (member) => {
    if (!member.user.bot && checarSeEhInvasor(`${member.user.username} ${member.displayName}`)) {
        await aplicarBanimentoGlobal(member.id, 'Nome proibido na entrada.');
    }
});

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!oldState.channelId && newState.channelId && newState.member && !newState.member.user.bot) {
        if (checarSeEhInvasor(`${newState.member.user.username} ${newState.member.displayName} ${newState.member.nickname || ''}`)) {
            await aplicarBanimentoGlobal(newState.member.id, 'Divulgação em voz.');
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'adcusuario') return;
    const usuarioId = interaction.options.getString('usuario_id');
    const linkConvite = interaction.options.getString('link_servidor');
    await interaction.deferReply();
    try {
        const dadosInvite = await client.fetchInvite(linkConvite);
        servidoresAutorizados.add(dadosInvite.guild.id);
        return interaction.editReply({ content: `<:certo:1508472499514376243> **Servidor Autorizado:** **${dadosInvite.guild.name}**` });
    } catch (error) {
        return interaction.editReply({ content: `<:erro:1508472500495974600> Erro ao puxar link.` });
    }
});

client.on('ready', async () => {
    console.log(`[ONLINE] Zyphor Security V3 carregado como: ${client.user.tag}`);
    const comandos = [
        new SlashCommandBuilder()
            .setName('adcusuario')
            .setDescription('📥 Autoriza um novo servidor.')
            .addStringOption(opt => opt.setName('usuario_id').setDescription('ID do dono').setRequired(true))
            .addStringOption(opt => opt.setName('link_servidor').setDescription('Link de convite').setRequired(true))
    ].map(cmd => cmd.toJSON());
    try {
        await new REST({ version: '10' }).setToken(TOKEN).put(Routes.applicationCommands(client.user.id), { body: comandos });
    } catch (error) {}
});

if (TOKEN) client.login(TOKEN);

