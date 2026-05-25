const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const unidecode = require('unidecode');

// 📌 INSIRA SUAS CONFIGURAÇÕES PRIVADAS AQUI
const TOKEN = 'SEU_TOKEN_AQUI';
const SEU_ID_DE_DEV = 'SEU_ID_DE_DISCORD_AQUI';

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 📌 LISTA NEGRA DE TERMOS (Sempre em letras normais e minúsculas)
const assinaturasGolpe = ['org', 'lideranca', 'apgratis', 'gratis', 'vagas', 'recrutamento'];

// 📌 BANCO DE DADOS EM MEMÓRIA (Coloque o ID do seu servidor principal para testes)
const servidoresAutorizados = new Set([
    'ID_DO_SEU_SERVIDOR_PRINCIPAL'
]);

/**
 * 🧠 INTELIGÊNCIA ANTIMODIFICAÇÃO DO ZYPHOR
 */
function checarSeEhInvasor(texto) {
    if (!texto) return false;
    // Converte letras fakes para normais, joga para minúsculo e remove os espaços
    const textoLimpo = unidecode(texto).toLowerCase().replace(/\s+/g, '');
    return assinaturasGolpe.some(termo => textoLimpo.includes(termo));
}

/**
 * ⚡ MÓDULO DE BANIMENTO GLOBAL
 */
async function aplicarBanimentoGlobal(userId, motivo) {
    console.log(`[ALERTA GLOBAL] Iniciando banimento em massa para o ID: ${userId}`);
    const servidores = client.guilds.cache.values();

    for (const guild of servidores) {
        try {
            await guild.members.ban(userId, { reason: `Zyphor Security [BAN GLOBAL]: ${motivo}` });
            console.log(`[BAN GLOBAL] Sucesso no servidor: ${guild.name}`);
        } catch (error) {
            continue; // Se não tiver permissão ou o usuário já estiver banido, ignora e segue
        }
    }
}

// -------------------------------------------------------------------------
// SISTEMA ANTIENTRADA DE SERVIDORES NÃO AUTORIZADOS
// -------------------------------------------------------------------------
client.on('guildCreate', async (guild) => {
    if (!servidoresAutorizados.has(guild.id)) {
        console.log(`[BLOQUEADO] Tentaram colocar o bot no servidor ${guild.name} (${guild.id}) sem autorização.`);
        try {
            const canal = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
            if (canal) {
                await canal.send(`<:erro:1508472500495974600> **Zyphor Security v3** é um sistema privado. Contate o desenvolvedor para autorizar seu servidor.`);
            }
        } catch (e) {}
        await guild.leave(); // Sai na hora!
    } else {
        console.log(`[AUTORIZADO] Zyphor entrou com sucesso no servidor: ${guild.name}`);
    }
});

// -------------------------------------------------------------------------
// GATILHOS DE MONITORAMENTO CONTRA RAIDERS E BOTS DE VOZ/APOSTAS
// -------------------------------------------------------------------------

// Gatilho 1: Entrada no Servidor
client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) return;
    const dadosPerfil = `${member.user.username} ${member.displayName}`;
    if (checarSeEhInvasor(dadosPerfil)) {
        await aplicarBanimentoGlobal(member.id, 'Conta identificada com nome proibido na entrada.');
    }
});

// Gatilho 2: Conexão em Call de Voz
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!oldState.channelId && newState.channelId) {
        const member = newState.member;
        if (!member || member.user.bot) return;

        const dadosPerfil = `${member.user.username} ${member.displayName} ${member.nickname || ''}`;
        if (checarSeEhInvasor(dadosPerfil)) {
            await aplicarBanimentoGlobal(member.id, 'Tentativa de raid / Divulgação em canal de voz.');
        }
    }
});

// Gatilho 3: Mudança de Apelido Local (Detém o golpe nas Filas de Apostas)
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (newMember.user.bot) return;
    if (oldMember.nickname !== newMember.nickname && newMember.nickname) {
        if (checarSeEhInvasor(newMember.nickname)) {
            await aplicarBanimentoGlobal(newMember.id, 'Alteração de apelido local para assinatura de golpe.');
        }
    }
});

// Gatilho 4: Mudança de Conta Global (Nome/Display Name)
client.on('userUpdate', async (oldUser, newUser) => {
    if (newUser.bot) return;
    const nomeMudou = oldUser.username !== newUser.username || oldUser.displayName !== newUser.displayName;
    
    if (nomeMudou) {
        const dadosPerfil = `${newUser.username} ${newUser.displayName}`;
        if (checarSeEhInvasor(dadosPerfil)) {
            await aplicarBanimentoGlobal(newUser.id, 'Alteração de perfil global para assinatura de ataque.');
        }
    }
});

// -------------------------------------------------------------------------
// REQUISITO INTERACTION: EXCLUSIVO /ADCUSUARIO DO DEV
// -------------------------------------------------------------------------
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === 'adcusuario') {
        if (interaction.user.id !== SEU_ID_DE_DEV) {
            return interaction.reply({ 
                content: `<:erro:1508472500495974600> **Acesso Negado!** Apenas o Desenvolvedor Oficial do Zyphor pode utilizar este comando.`, 
                ephemeral: true 
            });
        }

        const usuarioId = interaction.options.getString('usuario_id');
        const linkConvite = interaction.options.getString('link_servidor');

        await interaction.deferReply();

        try {
            // Puxa as informações através do Link de Convite
            const dadosInvite = await client.fetchInvite(linkConvite);
            const servidorId = dadosInvite.guild.id;
            const servidorNome = dadosInvite.guild.name;

            // Insere na Whitelist em tempo real
            servidoresAutorizados.add(servidorId);

            return interaction.editReply({
                content: [
                    `### <:criar:1507816968286375976> **NOVO SERVIDOR AUTORIZADO**`,
                    `<:id:1507816963811049572> **ID do Dono:** <@${usuarioId}> (\`${usuarioId}\`)`,
                    `<:monitoramento:1503163485264285776> **Servidor:** **${servidorNome}**`,
                    `<:codigo:1507816966704857098> **ID do Servidor:** \`${servidorId}\``,
                    `<:link:1503163783139557461> **Convite:** ${linkConvite}`,
                    ` `,
                    `<:certo:1508472499514376243> **Status:** Liberado! O Zyphor já pode entrar nesse servidor.`
                ].join('\n')
            });

        } catch (error) {
            return interaction.editReply({
                content: `<:erro:1508472500495974600> **Erro ao puxar link!** Verifique se o convite enviado é válido ou se não está expirado.`,
            });
        }
    }
});

// -------------------------------------------------------------------------
// CONEXÃO DO BOT E REGISTRO DO COMANDO SLASH
// -------------------------------------------------------------------------
client.on('ready', async () => {
    console.log(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`);
    console.log(`[ONLINE] Zyphor Security V3 carregado como: ${client.user.tag}`);
    console.log(`[INFO] Proteção ativa em ${client.guilds.cache.size} servidores cadastrados.`);
    console.log(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`);

    // Registra o comando /adcusuario diretamente na API do Discord
    const comandos = [
        new SlashCommandBuilder()
            .setName('adcusuario')
            .setDescription('⭐ [DEV ONLY] Autoriza um novo servidor para usar o Zyphor através do link.')
            .addStringOption(opt => opt.setName('usuario_id').setDescription('ID do dono do servidor').setRequired(true))
            .addStringOption(opt => opt.setName('link_servidor').setDescription('Link de convite do servidor').setRequired(true))
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: comandos });
        console.log('[SLASH COMMANDS] Comando /adcusuario publicado globalmente.');
    } catch (error) {
        console.error('[ERRO] Falha ao registrar os comandos slash:', error);
    }
});

client.login(TOKEN);

