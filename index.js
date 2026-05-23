const { Client, GatewayIntentBits, REST, Routes, SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, PermissionsBitField } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers, 
        GatewayIntentBits.GuildPresences
    ] 
});

// ID DO DESENVOLVEDOR (VOCÊ)
const DEV_ID = '1460149186577174680';

// Banco de dados temporário na memória do bot
const serverConfig = {
    antilink: false,
    antiraid: false,
    antispam: false,
    modoSilencioso: false,
    logChannelId: null, // ID do canal de logs (configurado via /setlogs)
    adminRoles: [],
    palavrasBloqueadas: ['hack', 'trava', 'maldito', 'fdp'] // Lista inicial de palavras proibidas
};

const mapaSpam = new Map();

// CONSTANTES DO RAID ESPECÍFICO ("Liderança Apostas")
const TERMOS_PROIBIDOS_PERFIL = [
    'orglideranca', 
    'lideranca', 
    'apostas', 
    'ap gratis', 
    'ap gratlѕ', 
    'vagas adm', 
    'vem farmar'
];

const commands = [
    new SlashCommandBuilder().setName('ping').setDescription('Responde Pong! 🏓'),
    new SlashCommandBuilder().setName('painel').setDescription('🛡️ Abre o painel principal de segurança'),
    new SlashCommandBuilder().setName('setup').setDescription('🛡️ Adiciona ou remove um cargo da lista de administradores do bot')
        .addRoleOption(o => o.setName('cargo').setDescription('O cargo a ser configurado').setRequired(true)),
    new SlashCommandBuilder().setName('setlogs').setDescription('📝 Define o canal onde o bot enviará as notificações de segurança (Logs)')
        .addChannelOption(o => o.setName('canal').setDescription('Selecione o canal de texto').setRequired(true)),
    new SlashCommandBuilder().setName('clear').setDescription('🧹 Limpa uma quantidade de mensagens do chat')
        .addIntegerOption(o => o.setName('quantidade').setDescription('Número de mensagens (1 a 100)').setRequired(true)),
    new SlashCommandBuilder().setName('addpalavra').setDescription('🚫 Adiciona uma palavra à lista negra do chat')
        .addStringOption(o => o.setName('palavra').setDescription('A palavra a ser bloqueada').setRequired(true)),
    new SlashCommandBuilder().setName('lockchannel').setDescription('🔒 Tranca o canal atual para membros comuns'),
    new SlashCommandBuilder().setName('unlockchannel').setDescription('🔓 Destranca o canal atual'),
    new SlashCommandBuilder().setName('embed').setDescription('🖼️ Cria um anúncio em formato Embed personalizado')
        .addStringOption(o => o.setName('titulo').setDescription('Título do embed').setRequired(true))
        .addStringOption(o => o.setName('descricao').setDescription('Descrição do embed').setRequired(true))
        .addStringOption(o => o.setName('foto').setDescription('URL da foto (Opcional)').setRequired(false)),
    new SlashCommandBuilder().setName('banmod').setDescription('🔨 Bane um usuário do servidor')
        .addUserOption(o => o.setName('usuario').setDescription('O usuário a ser banido').setRequired(true)),
    new SlashCommandBuilder().setName('kickmod').setDescription('🕳️ Expulsa um usuário do servidor')
        .addUserOption(o => o.setName('usuario').setDescription('O usuário a ser expulso').setRequired(true)),
    new SlashCommandBuilder().setName('stop').setDescription('🛑 Ativa o Modo Silencioso (Apaga todas as mensagens do chat)'),
    new SlashCommandBuilder().setName('start').setDescription('🟢 Desativa o Modo Silencioso e libera o chat'),
    
    // COMANDOS EXCLUSIVOS DO DESENVOLVEDOR (SÓ VOCÊ PODE VER/MEXER)
    new SlashCommandBuilder().setName('devpainel').setDescription('💻 [DEV ONLY] Abre o painel secreto de desenvolvedor do Zyphor'),
    new SlashCommandBuilder().setName('blacklistpalavra').setDescription('💻 [DEV ONLY] Adiciona palavra proibida global no bot')
        .addStringOption(o => o.setName('palavra').setDescription('Palavra proibida').setRequired(true))
];

client.once('ready', async () => {
    console.log(`✅ Zyphor Securityz conectado como ${client.user.tag}`);
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    try {
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Todos os comandos GLOBAIS sincronizados com o Discord com sucesso!');
    } catch (error) {
        console.error('❌ Erro ao sincronizar comandos globais:', error);
    }
});

// CHECAGEM DE ADM COMUM DO BOT
function temPermissao(member) {
    if (!member) return false;
    if (member.id === DEV_ID) return true; // Desenvolvedor ignora qualquer barreira
    if (member.id === member.guild.ownerId) return true;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
    if (serverConfig.adminRoles.some(roleId => member.roles.cache.has(roleId))) return true;
    return false;
}

async function enviarLog(guild, embed) {
    if (!serverConfig.logChannelId) return;
    try {
        const canal = await guild.channels.fetch(serverConfig.logChannelId);
        if (canal) await canal.send({ embeds: [embed] });
    } catch (err) {
        console.error('Erro ao enviar log:', err);
    }
}

function gerarPainel() {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ Centro de Comando - Zyphor Securityz')
        .setDescription('Controle as defesas ativas do seu servidor em tempo real através dos botões.')
        .setColor('#5865F2')
        .addFields(
            { name: '<:link:1503163783139557461> Filtro Anti-Link', value: serverConfig.antilink ? '🟢 **ATIVADO**' : '🔴 **DESATIVADO**', inline: true },
            { name: '<:Suporte:1501991877438738477> Defesa Anti-Raid', value: serverConfig.antiraid ? '🟢 **ATIVADO**' : '🔴 **DESATIVADO**', inline: true },
            { name: '<:muted:1501991571682496613> Filtro Anti-Spam', value: serverConfig.antispam ? '🟢 **ATIVADO**' : '🔴 **DESATIVADO**', inline: true },
            { name: '🤫 Modo Silencioso', value: serverConfig.modoSilencioso ? '🟢 **ATIVADO (CHAT TRANCADO)**' : '🔴 **DESATIVADO**', inline: false }
        )
        .setFooter({ text: 'Proteção Ativa Zyphor' });

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('toggle_link').setLabel('Anti-Link').setEmoji('1503163783139557461').setStyle(serverConfig.antilink ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('toggle_raid').setLabel('Anti-Raid').setEmoji('1501991877438738477').setStyle(serverConfig.antiraid ? ButtonStyle.Danger : ButtonStyle.Success),
        new ButtonBuilder().setCustomId('toggle_spam').setLabel('Anti-Spam').setEmoji('1501991571682496613').setStyle(serverConfig.antispam ? ButtonStyle.Danger : ButtonStyle.Success)
    );
    return { embeds: [embed], components: [row] };
}

client.on('interactionCreate', async (i) => {
    if (i.isChatInputCommand()) {
        
        // 🚨 TRAVA EXCLUSIVA DE DESENVOLVEDOR 🚨
        if (i.commandName === 'devpainel' || i.commandName === 'blacklistpalavra') {
            if (i.user.id !== DEV_ID) {
                return await i.reply({ content: '❌ Erro de Sistema: Apenas o Desenvolvedor do Zyphor tem permissão para rodar este comando.', ephemeral: true });
            }
        }

        if (i.commandName === 'ping') return await i.reply('Pong! 🏓');
        
        // COMANDOS DE MODERAÇÃO NORMAIS (VALIDAM STAFFS)
        if (i.commandName !== 'devpainel' && i.commandName !== 'blacklistpalavra') {
            if (!temPermissao(i.member)) {
                return await i.reply({ content: '❌ Você não tem permissão para usar comandos de moderação do Zyphor.', ephemeral: true });
            }
        }

        await i.deferReply().catch(() => {});

        // EXECUÇÃO DOS COMANDOS DE DESENVOLVEDOR
        if (i.commandName === 'devpainel') {
            const devEmbed = new EmbedBuilder()
                .setTitle('<:codigo:1478184124194881678> Console de Desenvolvedor - Zyphor')
                .setColor('#2F3136')
                .addFields(
                    { name: '💻 Dev Ativo:', value: `<@${DEV_ID}>`, inline: true },
                    { name: '🖥️ Total de Servidores:', value: `${client.guilds.cache.size}`, inline: true },
                    { name: '⚡ Latência da API:', value: `${client.ws.ping}ms`, inline: true }
                )
                .setFooter({ text: 'Acesso Restrito Interno' });
            return await i.editReply({ embeds: [devEmbed] });
        }

        if (i.commandName === 'blacklistpalavra') {
            const palavra = i.options.getString('palavra').toLowerCase();
            serverConfig.palavrasBloqueadas.push(palavra);
            return await i.editReply(`✅ Nova palavra adicionada à Blacklist Global pelo desenvolvedor: \`${palavra}\``);
        }

        // FIM DOS COMANDOS DE DEV

        if (i.commandName === 'painel') return await i.editReply(gerarPainel());

        if (i.commandName === 'setlogs') {
            const canal = i.options.getChannel('canal');
            serverConfig.logChannelId = canal.id;
            return await i.editReply(`✅ Canal de logs configurado com sucesso para ${canal}!`);
        }

        if (i.commandName === 'setup') {
            const cargo = i.options.getRole('cargo');
            if (serverConfig.adminRoles.includes(cargo.id)) {
                serverConfig.adminRoles = serverConfig.adminRoles.filter(id => id !== cargo.id);
                return await i.editReply(`❌ O cargo **${cargo.name}** foi removido dos admins do bot.`);
            } else {
                serverConfig.adminRoles.push(cargo.id);
                return await i.editReply(`<:Suporte:1501991877438738477> O cargo **${cargo.name}** agora pode gerenciar o bot!`);
            }
        }

        if (i.commandName === 'clear') {
            const qtd = i.options.getInteger('quantidade');
            if (qtd < 1 || qtd > 100) return await i.editReply('Por favor, selecione um número de 1 a 100.');
            try {
                const deletadas = await i.channel.bulkDelete(qtd, true);
                const embedLog = new EmbedBuilder()
                    .setTitle('<:sino:1507817911392407552> Chat Limpo')
                    .setColor('#FFFF00')
                    .addFields(
                        { name: 'Moderador:', value: `${i.user.tag}`, inline: true },
                        { name: 'Canal:', value: `${i.channel}`, inline: true },
                        { name: '<:documento:1482031015777140817> Qtd Deletada:', value: `${deletadas.size} mensagens`, inline: true }
                    );
                await enviarLog(i.guild, embedLog);
                return await i.editReply(`🧹 O chat teve ${deletadas.size} mensagens apagadas.`);
            } catch {
                return await i.editReply('❌ Ocorreu um erro ao tentar apagar mensagens (Mensagens com mais de 14 dias não podem ser limpas).');
            }
        }

        if (i.commandName === 'addpalavra') {
            const palavra = i.options.getString('palavra').toLowerCase();
            if (serverConfig.palavrasBloqueadas.includes(palavra)) return await i.editReply('Esta palavra já está na lista.');
            serverConfig.palavrasBloqueadas.push(palavra);
            return await i.editReply(`🚫 A palavra \`${palavra}\` foi adicionada ao filtro do chat.`);
        }

        if (i.commandName === 'lockchannel') {
            try {
                await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false });
                return await i.editReply('🔒 Este canal foi trancado para membros comuns.');
            } catch { return await i.editReply('Erro ao alterar permissões.'); }
        }

        if (i.commandName === 'unlockchannel') {
            try {
                await i.channel.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null });
                return await i.editReply('🔓 O canal foi destrancado com sucesso.');
            } catch { return await i.editReply('Erro ao alterar permissões.'); }
        }

        if (i.commandName === 'stop') {
            serverConfig.modoSilencioso = true;
            return await i.editReply('🛑 **Modo Silencioso Geral Ativado!** Todas as novas mensagens de membros comuns serão limpas.');
        }

        if (i.commandName === 'start') {
            serverConfig.modoSilencioso = false;
            return await i.editReply('🟢 **Modo Silencioso Desativado!** O chat voltou ao fluxo normal.');
        }

        if (i.commandName === 'embed') {
            const embed = new EmbedBuilder().setTitle(i.options.getString('titulo')).setDescription(i.options.getString('descricao')).setColor('#0099ff').setTimestamp();
            if (i.options.getString('foto')) embed.setImage(i.options.getString('foto'));
            return await i.editReply({ embeds: [embed] });
        }

        if (i.commandName === 'banmod') {
            const user = i.options.getUser('usuario');
            try { 
                await i.guild.members.ban(user, { reason: 'Punição por comando de Moderação Zyphor' });
                const log = new EmbedBuilder()
                    .setTitle('<:martelo:1503163618273792050> Membro Banido')
                    .setColor('Red')
                    .addFields(
                        { name: 'Infrator:', value: user.tag, inline: true }, 
                        { name: '<:id:1478184937587736657> ID:', value: user.id, inline: true }, 
                        { name: 'Staff:', value: i.user.tag, inline: false }
                    );
                await enviarLog(i.guild, log);
                return await i.editReply(`✅ O usuário **${user.tag}** foi banido!`); 
            } catch { return await i.editReply('❌ Não consegui banir o membro. Verifique minha hierarquia de cargos.'); }
        }

        if (i.commandName === 'kickmod') {
            const user = i.options.getUser('usuario');
            try { 
                await i.guild.members.kick(user, 'Punição por comando de Moderação Zyphor');
                const log = new EmbedBuilder()
                    .setTitle('<:martelo:1503163618273792050> Membro Expulso')
                    .setColor('Orange')
                    .addFields(
                        { name: 'Infrator:', value: user.tag, inline: true }, 
                        { name: '<:id:1478184937587736657> ID:', value: user.id, inline: true }, 
                        { name: 'Staff:', value: i.user.tag, inline: false }
                    );
                await enviarLog(i.guild, log);
                return await i.editReply(`✅ O usuário **${user.tag}** foi expulso.`); 
            } catch { return await i.editReply('❌ Não consegui expulsar o membro.'); }
        }
    }

    if (i.isButton()) {
        if (!temPermissao(i.member)) return i.reply({ content: '❌ Apenas administradores do Zyphor podem clicar nos botões.', ephemeral: true });
        if (i.customId === 'toggle_link') serverConfig.antilink = !serverConfig.antilink;
        if (i.customId === 'toggle_raid') serverConfig.antiraid = !serverConfig.antiraid;
        if (i.customId === 'toggle_spam') serverConfig.antispam = !serverConfig.antispam;
        await i.update(gerarPainel());
    }
});

client.on('guildMemberAdd', async (member) => {
    const nomeConta = member.user.username.toLowerCase();
    const tagConta = member.user.tag.toLowerCase();
    const statusCustom = member.presence?.activities[0]?.state?.toLowerCase() || ""; 

    const matchPerfilSuspeito = TERMOS_PROIBIDOS_PERFIL.some(termo => 
        nomeConta.includes(termo) || tagConta.includes(termo) || statusCustom.includes(termo)
    );

    if (matchPerfilSuspeito) {
        try {
            await member.ban({ reason: '🚨 ZYPHOR DEFESA: Conta identificada no padrão de Raid [Liderança/Apostas]' });
            const embedLog = new EmbedBuilder()
                .setTitle('<:martelo:1503163618273792050> ALVO FIXO BANIDO (Raid Detectado)')
                .setColor('Red')
                .setDescription(`Uma conta com o padrão exato da lista negra de ataques tentou se infiltrar no servidor e recebeu um banimento instantâneo.`)
                .addFields(
                    { name: 'Conta:', value: `${member.user.tag}`, inline: true },
                    { name: '<:id:1478184937587736657> ID:', value: `${member.id}`, inline: true },
                    { name: '<:sino:1507817911392407552> Gatilho:', value: 'Bio/Nome associado a "Liderança Apostas"', inline: false }
                );
            return await enviarLog(member.guild, embedLog);
        } catch (err) {
            console.error('Falha ao aplicar ban de raid automatizado:', err);
        }
    }

    if (serverConfig.antiraid) {
        const tempoMinimoConta = 1000 * 60 * 60 * 24 * 7; 
        const idadeConta = Date.now() - member.user.createdTimestamp;

        if (idadeConta < tempoMinimoConta) {
            try {
                await member.kick('Zyphor Anti-Raid: Conta com menos de 7 dias de criação.');
                const embedLog = new EmbedBuilder()
                    .setTitle('<:criar:1479143908356395058> Conta Barrada (Anti-Alt)')
                    .setColor('Orange')
                    .setDescription(`O sistema anti-raid bloqueou a entrada de uma conta muito recente.`)
                    .addFields(
                        { name: 'Tag do Usuário:', value: `${member.user.tag}`, inline: true },
                        { name: '<:id:1478184937587736657> ID:', value: `${member.id}`, inline: true }
                    );
                await enviarLog(member.guild, embedLog);
            } catch (err) { console.error(err); }
        }
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;
    if (temPermissao(message.member)) return; 

    const conteudoMensagem = message.content.toLowerCase();

    if (serverConfig.modoSilencioso) {
        try { await message.delete(); return; } catch {}
    }

    const contemPalavraProibida = serverConfig.palavrasBloqueadas.some(p => conteudoMensagem.includes(p));
    if (contemPalavraProibida) {
        try {
            await message.delete();
            const aviso = await message.channel.send(`<:sino:1507817911392407552> ${message.author}, você digitou uma palavra não permitida no servidor.`);
            setTimeout(() => aviso.delete().catch(() => {}), 4000);
            
            const log = new EmbedBuilder()
                .setTitle('<:sino:1507817911392407552> Palavra Bloqueada Apagada')
                .setColor('Yellow')
                .addFields(
                    { name: 'Membro:', value: `${message.author.tag}`, inline: true }, 
                    { name: '<:documento:1482031015777140817> Canal:', value: `${message.channel}`, inline: true },
                    { name: '<:codigo:1478184124194881678> Mensagem:', value: `${message.content}`, inline: false }
                );
            await enviarLog(message.guild, log);
            return;
        } catch {}
    }

    if (serverConfig.antilink) {
        const regexLink = /(https?:\/\/[^\s]+)|(www\.[^\s]+)|(discord\.gg\/[^\s]+)/gi;
        if (regexLink.test(message.content)) {
            try {
                await message.delete();
                const avisoLink = await message.channel.send(`<:link:1503163783139557461> ${message.author}, o sistema Anti-Link está ativado neste servidor.`);
                setTimeout(() => avisoLink.delete().catch(() => {}), 4000);

                const log = new EmbedBuilder()
                    .setTitle('<:link:1503163783139557461> Link Barrado')
                    .setColor('Yellow')
                    .addFields(
                        { name: 'Infrator:', value: `${message.author.tag}`, inline: true }, 
                        { name: 'Canal:', value: `${message.channel}`, inline: true }
                    );
                await enviarLog(message.guild, log);
                return;
            } catch {}
        }
    }

    if (serverConfig.antispam) {
        const usuarioId = message.author.id;
        const tempoAtual = Date.now();
        
        if (!mapaSpam.has(usuarioId)) mapaSpam.set(usuarioId, []);
        const historico = mapaSpam.get(usuarioId);
        historico.push(tempoAtual);
        
        const mensagensRecentes = historico.filter(tempo => tempoAtual - tempo < 3000);
        mapaSpam.set(usuarioId, mensagensRecentes);
        
        if (mensagensRecentes.length > 4) { 
            try {
                await message.delete();
                const membro = await message.guild.members.fetch(usuarioId);
                await membro.timeout(60000, 'Zyphor Anti-Spam: Envios excessivos de mensagens.');
                
                const avisoSpam = await message.channel.send(`<:muted:1501991571682496613> ${message.author} recebeu um castigo de 1 minuto por prática de Spam.`);
                setTimeout(() => avisoSpam.delete().catch(() => {}), 5000);

                const log = new EmbedBuilder()
                    .setTitle('<:muted:1501991571682496613> Timeout por Anti-Spam')
                    .setColor('Red')
                    .addFields(
                        { name: 'Membro castigado:', value: `${message.author.tag}`, inline: true },
                        { name: '<:id:1478184937587736657> ID:', value: `${usuarioId}`, inline: true }
                    );
                await enviarLog(message.guild, log);
            } catch {}
        }
    }
});

client.on('messageDelete', async (message) => {
    if (message.author?.bot || !message.guild || !message.content) return;
    const embedLog = new EmbedBuilder()
        .setTitle('<:mgs:1503163398395920464> Mensagem Deletada do Chat')
        .setColor('#FF0000')
        .addFields(
            { name: 'Autor da mensagem:', value: `${message.author.tag}`, inline: true },
            { name: 'Canal:', value: `${message.channel}`, inline: true },
            { name: '<:codigo:1478184124194881678> Conteúdo apagado:', value: `\`\`\`${message.content}\`\`\``, inline: false }
        );
    await enviarLog(message.guild, embedLog);
});

client.on('messageUpdate', async (antiga, nova) => {
    if (antiga.author?.bot || !antiga.guild || antiga.content === nova.content) return;
    const embedLog = new EmbedBuilder()
        .setTitle('<:editar:1501473720680583228> Mensagem Editada')
        .setColor('#00FFFF')
        .addFields(
            { name: 'Autor:', value: `${antiga.author.tag}`, inline: true },
            { name: 'Canal:', value: `${antiga.channel}`, inline: true },
            { name: '<:codigo:1478184124194881678> Antes:', value: `\`\`\`${antiga.content}\`\`\``, inline: false },
            { name: '<:codigo:1478184124194881678> Depois:', value: `\`\`\`${nova.content}\`\`\``, inline: false }
        );
    await enviarLog(antiga.guild, embedLog);
});

client.login(process.env.DISCORD_TOKEN);
