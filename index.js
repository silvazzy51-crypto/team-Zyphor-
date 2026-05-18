const { Client, GatewayIntentBits, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionsBitField, REST, Routes, SlashCommandBuilder } = require('discord.js');

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMembers
    ] 
});

// Começam como TRUE (Ligados) por padrão para facilitar seus testes!
let configServidor = { antiLink: true, antiSpam: true, antiRaid: true };
const spamMap = new Map();

// --- REGISTRO DOS COMANDOS ---
const commands = [
    new SlashCommandBuilder().setName('setup').setDescription('Painel de segurança').setDefaultMemberPermissions(PermissionsBitField.Flags.Administrator),
    new SlashCommandBuilder().setName('ban').setDescription('Bane um usuário do servidor.').addUserOption(o => o.setName('alvo').setRequired(true).setDescription('Selecione o usuário')).setDefaultMemberPermissions(PermissionsBitField.Flags.BanMembers),
    new SlashCommandBuilder().setName('kick').setDescription('Expulsa um usuário do servidor.').addUserOption(o => o.setName('alvo').setRequired(true).setDescription('Selecione o usuário')).setDefaultMemberPermissions(PermissionsBitField.Flags.KickMembers),
    new SlashCommandBuilder().setName('lockdown').setDescription('Bloqueia o envio de mensagens neste chat.').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels),
    new SlashCommandBuilder().setName('unlockdown').setDescription('Desbloqueia o envio de mensagens neste chat.').setDefaultMemberPermissions(PermissionsBitField.Flags.ManageChannels)
].map(c => c.toJSON());

client.once('ready', async () => {
    try {
        const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
        await rest.put(Routes.applicationCommands(client.user.id), { body: commands });
        console.log('✅ Bot online e comandos slash registrados com sucesso!');
    } catch (err) {
        console.error('Erro ao registrar comandos:', err);
    }
});

// --- FUNÇÃO AUXILIAR PARA GERAR O EMBED E MENU DO SETUP ---
function gerarPainelSetup() {
    const embed = new EmbedBuilder()
        .setTitle('🛡️ Painel de Segurança')
        .setColor('#2b2d31')
        .setDescription(`🔗 Anti-Link: ${configServidor.antiLink ? '🟢 ATIVO' : '🔴 DESATIVADO'}\n⚠️ Anti-Spam: ${configServidor.antiSpam ? '🟢 ATIVO' : '🔴 DESATIVADO'}\n🔨 Anti-Raid: ${configServidor.antiRaid ? '🟢 ATIVO' : '🔴 DESATIVADO'}`);
    
    const menu = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('menu_setup')
            .setPlaceholder('Clique para alternar as funções...')
            .addOptions([
                { label: 'Alternar Anti-Link', value: 'link', description: 'Ativa/Desativa o bloqueador de links.' },
                { label: 'Alternar Anti-Spam', value: 'spam', description: 'Ativa/Desativa o silenciador de flood.' },
                { label: 'Alternar Anti-Raid', value: 'raid', description: 'Ativa/Desativa a expulsão de contas fakes novas.' }
            ])
    );
    return { embeds: [embed], components: [menu] };
}

// --- INTERAÇÕES (Slash Commands e Menus) ---
client.on('interactionCreate', async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName, options } = interaction;

        if (commandName === 'setup') {
            const painel = gerarPainelSetup();
            await interaction.reply({ embeds: painel.embeds, components: painel.components, ephemeral: true });
        }
        else if (commandName === 'ban') {
            const usuario = options.getUser('alvo');
            const membro = interaction.guild.members.cache.get(usuario.id);
            
            if (!membro) return interaction.reply({ content: '❌ Usuário não encontrado no servidor.', ephemeral: true });
            if (!membro.bannable) return interaction.reply({ content: '❌ Eu não tenho permissão para banir esse usuário (o cargo dele pode ser maior que o meu).', ephemeral: true });
            
            await membro.ban({ reason: 'Banido via comando slash.' });
            await interaction.reply(`🔨 O usuário **${usuario.tag}** foi banido com sucesso.`);
        }
        else if (commandName === 'kick') {
            const usuario = options.getUser('alvo');
            const membro = interaction.guild.members.cache.get(usuario.id);
            
            if (!membro) return interaction.reply({ content: '❌ Usuário não encontrado no servidor.', ephemeral: true });
            if (!membro.kickable) return interaction.reply({ content: '❌ Eu não tenho permissão para expulsar esse usuário.', ephemeral: true });
            
            await membro.kick('Expulso via comando slash.');
            await interaction.reply(`Boot 👢 O usuário **${usuario.tag}** foi expulso com sucesso.`);
        }
        else if (commandName === 'lockdown') {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: false });
            await interaction.reply('🔒 Este canal foi bloqueado para membros.');
        }
        else if (commandName === 'unlockdown') {
            await interaction.channel.permissionOverwrites.edit(interaction.guild.id, { SendMessages: true });
            await interaction.reply('🔓 Este canal foi desbloqueado.');
        }
    }

    // LÓGICA DO MENU CORRIGIDA (O painel agora atualiza visualmente e não some!)
    if (interaction.isStringSelectMenu() && interaction.customId === 'menu_setup') {
        const val = interaction.values[0];
        if (val === 'link') configServidor.antiLink = !configServidor.antiLink;
        if (val === 'spam') configServidor.antiSpam = !configServidor.antiSpam;
        if (val === 'raid') configServidor.antiRaid = !configServidor.antiRaid;
        
        const painelAtualizado = gerarPainelSetup();
        await interaction.update({ embeds: painelAtualizado.embeds, components: painelAtualizado.components });
    }
});

// --- PROTEÇÃO AUTOMÁTICA ---
client.on('messageCreate', async (m) => {
    if (m.author.bot || !m.guild) return;

    // --- ANTI-LINK (Apaga links de convites e links HTTP de membros comuns) ---
    if (configServidor.antiLink && !m.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        if (m.content.includes('http') || m.content.includes('discord.gg')) {
            await m.delete().catch(() => {});
            return;
        }
    }

    // --- ANTI-SPAM (Se mandar mais de 3 msgs em menos de 3 segundos leva timeout) ---
    if (configServidor.antiSpam && !m.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
        const user = m.author.id;
        const agora = Date.now();
        const info = spamMap.get(user) || { count: 0, last: agora };
        
        if (agora - info.last < 3000) info.count++; else info.count = 1;
        info.last = agora;
        spamMap.set(user, info);

        if (info.count > 3) {
            await m.member.timeout(60000, 'Anti-Spam: Enviando mensagens muito rápido.').catch(() => {});
            spamMap.delete(user);
            await m.channel.send(`⚠️ ${m.author} recebeu um castigo de 1 minuto por fazer spam no chat.`);
        }
    }
});

// --- ANTI-RAID (Expulsa fakes com menos de 2 dias de conta criada) ---
client.on('guildMemberAdd', async (m) => {
    if (configServidor.antiRaid) {
        const idadeContaDias = (Date.now() - m.user.createdAt) / (1000 * 60 * 60 * 24);
        if (idadeContaDias < 2) {
            await m.send(`⚠️ Você foi removido do servidor porque sua conta é muito recente (Proteção Anti-Raid).`).catch(() => {});
            await m.kick('Anti-Raid: Conta criada há menos de 48 horas.').catch(() => {});
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
