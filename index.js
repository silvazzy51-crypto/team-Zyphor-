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
    globalAlertChannelId: null, 
    adminRoles: [], 
    palavrasBloqueadas: ['hack', 'trava', 'maldito', 'fdp', 'macaco', 'org']
};

const mapaSpam = new Map();
const TERMOS_PROIBIDOS_PERFIL = ['orglideranca', 'lideranca', 'apostas', 'ap gratis', 'vagas adm', 'vem farmar'];

// DEFINIÇÃO DOS COMANDOS
const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Verifica a latencia do bot'),
    new SlashCommandBuilder().setName('painel').setDescription('Abre o painel de controle de seguranca'),
    new SlashCommandBuilder().setName('suporte').setDescription('Envia o link oficial do servidor de suporte do bot'),
    new SlashCommandBuilder().setName('setup').setDescription('Configura ate 3 cargos administrativos para gerenciar o bot')
        .addRoleOption(o => o.setName('cargo1').setDescription('Primeiro cargo admin').setRequired(true))
        .addRoleOption(o => o.setName('cargo2').setDescription('Segundo cargo admin').setRequired(false))
        .addRoleOption(o => o.setName('cargo3').setDescription('Terceiro cargo admin').setRequired(false)),
    new SlashCommandBuilder().setName('setlogs').setDescription('Define o canal de logs local deste servidor')
        .addChannelOption(o => o.setName('canal').setDescription('Canal de texto').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('Limpa mensagens do chat')
        .addIntegerOption(o => o.setName('quantidade').setDescription('Numero de 1 a 100').setRequired(true)),
    new SlashCommandBuilder().setName('addpalavra').setDescription('Adiciona palavra ao filtro local')
        .addStringOption(o => o.setName('palavra').setDescription('Palavra a ser bloqueada').setRequired(true)),
    new SlashCommandBuilder().setName('lockchannel').setDescription('Tranca o canal atual'),
    new SlashCommandBuilder().setName('unlockchannel').setDescription('Destranca o canal atual'),
    
    // COMANDOS EXCLUSIVOS DO DESENVOLVEDOR (DEV ONLY)
    new SlashCommandBuilder().setName('dev').setDescription('[DEV ONLY] Console geral de servidores, links e dados'),
    new SlashCommandBuilder().setName('global').setDescription('[DEV ONLY] Define o canal de monitoramento')
        .addChannelOption(o => o.setName('canal').setDescription('Canal de alertas').setRequired(true))
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
    const statusLink = serverConfig.antilink ? '🟩 **ATIVADO**' : '🟥 **DESATIVADO**';
    const statusRaid = serverConfig.antiraid ? '🟩 **ATIVADO**' : '🟥 **DESATIVADO**';
    const statusSpam = serverConfig.antispam ? '🟩 **ATIVADO**' : '🟥 **DESATIVADO**';

    const embed = new EmbedBuilder()
        .setTitle('🛡️ Centro de Controle — Zyphor Security')
        .setDescription('Gerencie as camadas de proteção ativa do servidor utilizando os botões abaixo.')
        .setColor('#5865F2')
        .addFields(
            { name: '🔗 Sistema Anti-Link', value: statusLink, inline: true },
            { name: '🚨 Filtro Anti-Raid', value: statusRaid, inline: true },
            { name: '🤫 Proteção Anti-Spam', value: statusSpam, inline: true }
        )
        .setFooter({ text: 'Proteção em tempo real ativa.' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tg_link').setLabel('Anti-Link').setStyle(serverConfig.antilink ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tg_raid').setLabel('Anti-Raid').setStyle(serverConfig.antiraid ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('tg_spam').setLabel('Anti-Spam').setStyle(serverConfig.antispam ? ButtonStyle.Danger : ButtonStyle.Success)
    );
    return { embeds: [embed], components: [row] };
}

client.on('interactionCreate', async (i) => {
    if (!i.isChatInputCommand()) {
        if (i.isButton() && ['tg_link', 'tg_raid', 'tg_spam'].includes(i.customId)) {
            if (!temPermissao(i.member)) return i.reply({ content: '❌ **Erro:** Apenas membros autorizados da Staff podem usar esses botões.', ephemeral: true });
            if (i.customId === 'tg_link') serverConfig.antilink = !serverConfig.antilink;
            if (i.customId === 'tg_raid') serverConfig.antiraid = !serverConfig.antiraid;
            if (i.customId === 'tg_spam') serverConfig.antispam = !serverConfig.antispam;
            return await i.update(gerarPainelSeguranca());
        }
        return;
    }

    if (i.commandName === 'dev' || i.commandName === 'global') {
        if (i.user.id !== DEV_ID) {
            return await i.reply({ content: '🔒 **Acesso Negado:** Comando restrito apenas ao Desenvolvedor do bot.', ephemeral: true });
        }
    } else if (!temPermissao(i.member)) {
        return await i.reply({ content: '❌ **Acesso Negado:** Você precisa de um cargo administrativo configurado para usar o Zyphor.', ephemeral: true });
    }

    await i.deferReply().catch(() => {});

    if (i.commandName === 'global') {
        const canal = i.options.getChannel('canal');
        serverConfig.globalAlertChannelId = canal.id;
        const embed = new EmbedBuilder()
            .setTitle('🚨 Monitoramento Global Conectado')
            .setDescription(`Seu canal central de alertas foi definido com sucesso em <#${canal.id}>.\nQualquer atividade suspeita em servidores externos será reportada aqui de forma imediata.`)
            .setColor('#FF0000')
            .setTimestamp();
        return await i.editReply({ embeds: [embed] });
    }

    if (i.commandName === 'suporte') {
        const embedSuporte = new EmbedBuilder()
            .setTitle('Central de Ajuda e Suporte')
            .setDescription(`Precisa de auxilio tecnico ou quer tirar duvidas sobre o projeto?\n\nClique no botao abaixo para acessar nossa comunidade oficial:\n\n➡️ **[Servidor de Suporte Oficial](${LINK_SERVIDOR_SUPORTE})**`)
            .setColor('#5865F2')
            .setFooter({ text: 'Zyphor Security Helpdesk' });
        return await i.editReply({ embeds: [embedSuporte] });
    }

    if (i.commandName === 'dev') {
        const embedDev = new EmbedBuilder()
            .setTitle('💻 Terminal de Controle Central')
            .setColor('#2B2D31')
            .setTimestamp();

        const guildList = client.guilds.cache;
        let descricao = `📊 **Estatísticas Globais:**\n🔹 Total de Servidores: \`${guildList.size}\`\n\n**Lista Detalhada:**\n`;

        for (const [id, guild] of guildList) {
            let linkInvite = '❌ Sem permissão de convite';
            try {
                const canalAlvo = guild.channels.cache.find(c => c.type === ChannelType.GuildText);
                if (canalAlvo) {
                    const invite = await guild.invites.create(canalAlvo.id, { maxAge: 0, maxUses: 0 });
                    linkInvite = `🔗 [Entrar no Servidor](${invite.url})`;
                }
            } catch {}
            
            const fotoServer = guild.iconURL({ dynamic: true }) ? `🖼️ [Ver Ícone](${guild.iconURL({ dynamic: true })})` : '⚪ Sem Ícone';
            
            descricao += `🏠 **Nome:** \`${guild.name}\`\n🆔 **ID:** \`${guild.id}\`\n👥 **Membros:** \`${guild.memberCount}\`\n📸 **Avatar:** ${fotoServer}\n🔗 **Acesso:** ${linkInvite}\n───────────────────\n`;
        }

        embedDev.setDescription(descricao);
        return await i.editReply({ embeds: [embedDev] });
    }

    if (i.commandName === 'ping') return await i.editReply(`🏓 **Pong!** Latência da API: \`${client.ws.ping}ms\``);
    if (i.commandName === 'painel') return await i.editReply(gerarPainelSeguranca());
    
    if (i.commandName === 'setlogs') {
        serverConfig.logChannelId = i.options.getChannel('canal').id;
        return await i.editReply('🟩 **Sucesso:** Canal de registros locais salvo corretamente.');
    }

    if (i.commandName === 'setup') {
        const c1 = i.options.getRole('cargo1');
        const c2 = i.options.getRole('cargo2');
        const c3 = i.options.getRole('cargo3');

        if (c1 && !serverConfig.adminRoles.includes(c1.id)) serverConfig.adminRoles.push(c1.id);
        if (c2 && !serverConfig.adminRoles.includes(c2.id)) serverConfig.adminRoles.push(c2.id);
        if (c3 && !serverConfig.adminRoles.includes(c3.id)) serverConfig.adminRoles.push(c3.id);

        return await i.editReply(`🛠️ **Configuração Concluída:** Os cargos selecionados agora têm controle total sobre o bot.\n👥 **Cargos Staff:** ${serverConfig.adminRoles.map(id => `<@&${id}>`).join(', ')}`);
    }

    if (i.commandName === 'addpalavra') {
        const p = i.options.getString('palavra').toLowerCase();
        if (!serverConfig.palavrasBloqueadas.includes(p)) serverConfig.palavrasBloqueadas.push(p);
        return await i.editReply(`🚫 **Filtro Atualizado:** A palavra \`${p}\` foi incluída no bloqueador de chat.`);
    }

    if (i.commandName === 'clear') {
        const qtd = i.options.getInteger('quantidade');
        const del = await i.channel.bulkDelete(qtd, true).catch(() => []);
        return await i.editReply(`🧹 **Chat Limpo:** Foram removidas \`${del.size || del.length || 0}\` mensagens do canal.`);
    }

    if (i.commandName === 'lockchannel') {
        await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
        return await i.editReply('🔒 **Canal Trancado:** Chat fechado para interações de membros comuns.');
    }

    if (i.commandName === 'unlockchannel') {
        await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
        return await i.editReply('🔓 **Canal Liberado:** Chat desbloqueado com sucesso.');
    }
});

// MONITORAMENTO DE ENTRADA (ANTI-RAID GLOBAL DA BIO/NOME)
client.on('guildMemberAdd', async (member) => {
    const nome = member.user.username.toLowerCase();
    const status = member.presence?.activities[0]?.state?.toLowerCase() || "";

    const detectado = TERMOS_PROIBIDOS_PERFIL.some(t => nome.includes(t) || status.includes(t));

    if (detectado) {
        try {
            await member.ban({ reason: '🚨 Filtro Automático: Conta com perfil associado a padrões de Raid.' });
            
            const alertaDev = new EmbedBuilder()
                .setTitle('🚨 MONITORAMENTO: TENTATIVA DE RAID CONTROLADA')
                .setColor('#FF0000')
                .addFields(
                    { name: '🏠 Servidor Alvo:', value: `\`${member.guild.name}\``, inline: true },
                    { name: '👤 Usuário Banido:', value: `\`${member.user.tag}\``, inline: true },
                    { name: '🆔 Identificador (ID):', value: `\`${member.id}\``, inline: true }
                )
                .setTimestamp();
            await enviarAlertaGlobal(alertaDev);
        } catch {}
    }
});

// FILTROS DE MENSAGENS NO CHAT (IGNORA CARGOS DA STAFF)
client.on('messageCreate', async (m) => {
    if (m.author.bot || !m.guild) return;
    if (temPermissao(m.member)) return; 

    const txt = m.content.toLowerCase();

    const proibida = serverConfig.palavrasBloqueadas.some(p => txt.includes(p));
    if (proibida) {
        try {
            await m.delete();
            const aviso = await m.channel.send(`⚠️ <@${m.author.id}>, mensagens com palavras proibidas não são permitidas por aqui.`);
            setTimeout(() => aviso.delete().catch(() => {}), 4000);
            
            const alertaDev = new EmbedBuilder()
                .setTitle('🚫 Alerta de Mensagem Removida')
                .setColor('#EAB308')
                .addFields(
                    { name: '🏠 Servidor Local:', value: m.guild.name, inline: true },
                    { name: '👤 Usuário Infrator:', value: m.author.tag, inline: true },
                    { name: '📝 Conteúdo Filtrado:', value: `\`\`\`${m.content}\`\`\`` }
                );
            await enviarAlertaGlobal(alertaDev);
            return;
        } catch {}
    }

    if (serverConfig.antilink) {
        const regexLink = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)/gi;
        if (regexLink.test(m.content)) {
            try {
                await m.delete();
                const avisoL = await m.channel.send(`🔗 <@${m.author.id}>, o compartilhamento de links externos está bloqueado neste canal.`);
                setTimeout(() => avisoL.delete().catch(() => {}), 4000);
                return;
            } catch {}
        }
    }
});

client.login(process.env.DISCORD_TOKEN);

