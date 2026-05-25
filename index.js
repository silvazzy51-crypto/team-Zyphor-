// 📦 SISTEMA AUTO-INSTALÁVEL PARA A RAILWAY
try {
    require('unidecode');
} catch (e) {
    console.log('[SISTEMA] Biblioteca "unidecode" não encontrada. Instalando automaticamente...');
    require('child_process').execSync('npm install unidecode');
    console.log('[SISTEMA] "unidecode" instalada com sucesso! Iniciando o bot...');
}

const { Client, GatewayIntentBits, SlashCommandBuilder, REST, Routes } = require('discord.js');
const unidecode = require('unidecode');

// 📌 CONFIGURAÇÕES PROTEGIDAS (Puxando de forma totalmente segura do painel da Railway)
const TOKEN = process.env.DISCORD_TOKEN;
const SEU_ID_DE_DEV = process.env.DEV_ID;

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// 📌 LISTA NEGRA DE TERMOS
const assinaturasGolpe = ['org', 'lideranca', 'apgratis', 'gratis', 'vagas', 'recrutamento'];

// 📌 BANCO DE DADOS EM MEMÓRIA (Insira o ID do seu servidor principal se desejar)
const servidoresAutorizados = new Set([
    'ID_DO_SEU_SERVIDOR_PRINCIPAL'
]);

function checarSeEhInvasor(texto) {
    if (!texto) return false;
    const textoLimpo = unidecode(texto).toLowerCase().replace(/\s+/g, '');
    return assinaturasGolpe.some(termo => textoLimpo.includes(termo));
}

async function aplicarBanimentoGlobal(userId, motivo) {
    console.log(`[ALERTA GLOBAL] Iniciando banimento em massa para o ID: ${userId}`);
    const servidores = client.guilds.cache.values();

    for (const guild of servidores) {
        try {
            await guild.members.ban(userId, { reason: `Zyphor Security [BAN GLOBAL]: ${motivo}` });
            console.log(`[BAN GLOBAL] Sucesso no servidor: ${guild.name}`);
        } catch (error) {
            continue; 
        }
    }
}

client.on('guildCreate', async (guild) => {
    if (!servidoresAutorizados.has(guild.id)) {
        console.log(`[BLOQUEADO] Tentaram colocar o bot no servidor ${guild.name} (${guild.id}) sem autorização.`);
        try {
            const canal = guild.channels.cache.find(c => c.isTextBased() && c.permissionsFor(guild.members.me).has('SendMessages'));
            if (canal) {
                await canal.send(`<:erro:1508472500495974600> **Zyphor Security v3** é um sistema privado. Contate o desenvolvedor para autorizar seu servidor.`);
            }
        } catch (e) {}
        await guild.leave(); 
    } else {
        console.log(`[AUTORIZADO] Zyphor entrou com sucesso no servidor: ${guild.name}`);
    }
});

client.on('guildMemberAdd', async (member) => {
    if (member.user.bot) return;
    const dadosPerfil = `${member.user.username} ${member.displayName}`;
    if (checarSeEhInvasor(dadosPerfil)) {
        await aplicarBanimentoGlobal(member.id, 'Conta identificada com nome proibido na entrada.');
    }
});

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

client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (newMember.user.bot) return;
    if (oldMember.nickname !== newMember.nickname && newMember.nickname) {
        if (checarSeEhInvasor(newMember.nickname)) {
            await aplicarBanimentoGlobal(newMember.id, 'Alteração de apelido local para assinatura de golpe.');
        }
    }
});

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
            const dadosInvite = await client.fetchInvite(linkConvite);
            const servidorId = dadosInvite.guild.id;
            const servidorNome = dadosInvite.guild.name;

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

client.on('ready', async () => {
    console.log(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`);
    console.log(`[ONLINE] Zyphor Security V3 carregado como: ${client.user.tag}`);
    console.log(`▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬`);

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

// Inicialização segura que evita travamento no ambiente de build
if (TOKEN) {
    client.login(TOKEN);
} else {
    console.log("[AVISO] Aguardando injeção do DISCORD_TOKEN para iniciar a conexão.");
}

