// =================================================================
// ZYPHOR SECURITYZ - VERSÃO FINAL (SISTEMA DE SEGURANÇA INTEGRAL)
// =================================================================

const { 
    Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, 
    ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, 
    PermissionsBitField, ChannelType 
} = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences
    ] 
});

// ID DO DESENVOLVEDOR SUPREMO (VOCÊ)
const DEV_ID = '1460149186577174680';

// LINK DO SEU SERVIDOR DE SUPORTE OFICIAL (ATUALIZADO!)
const LINK_SERVIDOR_SUPORTE = 'https://discord.gg/nRyjV5BG9'; 

// Banco de dados na memória do bot
const serverConfig = {
    antilink: false,
    antiraid: false,
    antispam: false,
    logChannelId: null,
    globalAlertChannelId: null, // Canal central do DEV
    adminRoles: [], // Múltiplos cargos configurados
    palavrasBloqueadas: ['hack', 'trava', 'maldito', 'fdp', 'macaco', 'org']
};

const mapaSpam = new Map();
const TERMOS_PROIBIDOS_PERFIL = ['orglideranca', 'lideranca', 'apostas', 'ap gratis', 'vagas adm', 'vem farmar'];

// DEFINIÇÃO DOS COMANDOS
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('🏓 Verifica a latência do bot'),
    new SlashCommandBuilder().setName('painel').setDescription('🛡️ Abre o painel de controle de segurança'),
    new SlashCommandBuilder().setName('suporte').setDescription('🎫 Envia o link oficial do servidor de suporte do bot'),
    new SlashCommandBuilder().setName('setup').setDescription('🛠️ Configura até 3 cargos administrativos para gerenciar o bot')
        .addRoleOption(o => o.setName('cargo1').setDescription('Primeiro cargo admin').setRequired(true))
        .addRoleOption(o => o.setName('cargo2').setDescription('Segundo cargo admin (Opcional)').setRequired(false))
        .addRoleOption(o => o.setName('cargo3').setDescription('Terceiro cargo admin (Opcional)').setRequired(false)),
    new SlashCommandBuilder().setName('setlogs').setDescription('📝 Define o canal de logs local deste servidor')
        .addChannelOption(o => o.setName('canal').setDescription('Canal de texto').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('🧹 Limpa mensagens do chat')
        .addIntegerOption(o => o.setName('quantidade').setDescription('Número de 1 a 100').setRequired(true)),
    new SlashCommandBuilder().setName('addpalavra').setDescription('🚫 Adiciona palavra ao filtro local')
        .addStringOption(o => o.setName('palavra').setDescription('Palavra a ser bloqueada').setRequired(true)),
    new SlashCommandBuilder().setName('lockchannel').setDescription('🔒 Tranca o canal atual'),
    new SlashCommandBuilder().setName('unlockchannel').setDescription('🔓 Destranca o canal atual'),
    
    // COMANDOS EXCLUSIVOS DO DESENVOLVEDOR (DEV ONLY)
    new SlashCommandBuilder().setName('dev').setDescription('💻 [DEV ONLY] Console geral de servidores, links e dados'),
    new SlashCommandBuilder().setName('global').setDescription('🚨 [DEV ONLY] Define o canal central para receber monitoramento de raids')
        .addChannelOption(o => o.setName('canal').setDescription('Canal central de alertas').setRequired(true))
];

client.once('ready', async () => {
    console.log(`✅ Zyphor V3 Conectado como ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Comandos globais sincronizados com o Discord!');
    } catch (error) { console.error(error); }
});

// CHECAGEM DE PERMISSÕES
function temPermissao(member) {
    if (!member) return false;
    if (member.id === DEV_ID) return true;
    if (member.id === member.guild.ownerId) return true;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    if (serverConfig.adminRoles.some(roleId => member.roles.cache.has(roleId))) return true;
    return false;
}

async function enviarAlertaGlobal(embed) {
    if (!serverConfig.globalAlertChannelId) return;
    try {
        const canal = await client.channels.fetch(serverConfig.globalAlertChannelId);
        if (canal) await canal.send({ embeds: [embed] });
    } catch {}
}

function gerarPainelSeguranca() {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ Centro de Controle — Zyphor Security')
        .setDescription('Gerencie as camadas de proteção ativa do servidor utilizando os botões abaixo.')
        .setColor('#5865F2')
        .addFields(
            { name: '🔗 Sistema Anti-Link', value: serverConfig.antilink ? '🟩 **ATIVADO**' : '🟥 **DESATIVADO**', inline: true },
            { name: '🚨 Filtro Anti-Raid', value: serverConfig.antiraid ? '🟩 **ATIVADO**' : '🟥 **DESATIVADO**', inline: true },
            { name: '🤫 Proteção Anti-Sp

