import discord
from discord.ext import commands
from discord import app_commands
from database import Database

db = Database()

class Setup(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @app_commands.command(name="setup", description="Configurar admins e roles do servidor")
    @app_commands.default_permissions(administrator=True)
    async def setup(self, interaction: discord.Interaction):
        """Setup completo do servidor"""
        guild_id = interaction.guild_id
        
        # Criar embed principal
        embed = discord.Embed(
            title="⚙️ Setup do Servidor",
            description="Configure os admins e roles de moderação do seu servidor",
            color=discord.Color.blue()
        )
        
        # View com botões
        view = SetupView(self.bot, guild_id)
        
        await interaction.response.send_message(embed=embed, view=view, ephemeral=True)

    @app_commands.command(name="addadmin", description="Adicionar admin ao servidor")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(user="Usuário a ser adicionado como admin")
    async def addadmin(self, interaction: discord.Interaction, user: discord.User):
        """Adicionar um admin"""
        guild_id = interaction.guild_id
        
        # Adicionar ao banco de dados
        db.add_admin(guild_id, user.id)
        
        embed = discord.Embed(
            title="✅ Admin Adicionado",
            description=f"{user.mention} agora é um admin do servidor!",
            color=discord.Color.green()
        )
        
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="removeadmin", description="Remover admin do servidor")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(user="Admin a ser removido")
    async def removeadmin(self, interaction: discord.Interaction, user: discord.User):
        """Remover um admin"""
        guild_id = interaction.guild_id
        
        # Remover do banco de dados
        db.remove_admin(guild_id, user.id)
        
        embed = discord.Embed(
            title="❌ Admin Removido",
            description=f"{user.mention} não é mais admin do servidor!",
            color=discord.Color.red()
        )
        
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="listadmins", description="Listar todos os admins do servidor")
    @app_commands.default_permissions(administrator=True)
    async def listadmins(self, interaction: discord.Interaction):
        """Listar admins"""
        guild_id = interaction.guild_id
        admins = db.get_admins(guild_id)
        
        if not admins:
            embed = discord.Embed(
                title="📋 Admins do Servidor",
                description="Nenhum admin configurado ainda!",
                color=discord.Color.orange()
            )
        else:
            admin_list = "\n".join([f"<@{admin_id}>" for admin_id in admins])
            embed = discord.Embed(
                title="📋 Admins do Servidor",
                description=admin_list,
                color=discord.Color.blue()
            )
        
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="setmodrole", description="Definir role de moderador")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(role="Role que será moderadora")
    async def setmodrole(self, interaction: discord.Interaction, role: discord.Role):
        """Definir role de mod"""
        guild_id = interaction.guild_id
        
        db.set_mod_role(guild_id, role.id)
        
        embed = discord.Embed(
            title="✅ Mod Role Definida",
            description=f"{role.mention} agora é a role de moderador!",
            color=discord.Color.green()
        )
        
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="setlogchannel", description="Definir canal de logs")
    @app_commands.default_permissions(administrator=True)
    @app_commands.describe(channel="Canal para os logs de moderação")
    async def setlogchannel(self, interaction: discord.Interaction, channel: discord.TextChannel):
        """Definir canal de logs"""
        guild_id = interaction.guild_id
        
        db.set_log_channel(guild_id, channel.id)
        
        embed = discord.Embed(
            title="✅ Canal de Logs Definido",
            description=f"{channel.mention} agora receberá todos os logs de moderação!",
            color=discord.Color.green()
        )
        
        await interaction.response.send_message(embed=embed, ephemeral=True)

    @app_commands.command(name="serverconfig", description="Ver configurações do servidor")
    @app_commands.default_permissions(administrator=True)
    async def serverconfig(self, interaction: discord.Interaction):
        """Ver configurações"""
        guild_id = interaction.guild_id
        config = db.get_server_config(guild_id)
        
        admins = config.get('admins', [])
        mod_role = config.get('mod_role')
        log_channel = config.get('log_channel')
        
        admin_text = f"{len(admins)} admin(s) configurado(s)" if admins else "Nenhum admin"
        mod_text = f"<@&{mod_role}>" if mod_role else "Não definido"
        log_text = f"<#{log_channel}>" if log_channel else "Não definido"
        
        embed = discord.Embed(
            title="⚙️ Configurações do Servidor",
            color=discord.Color.blue()
        )
        embed.add_field(name="👨‍💼 Admins", value=admin_text, inline=False)
        embed.add_field(name="🛡️ Mod Role", value=mod_text, inline=False)
        embed.add_field(name="📝 Canal de Logs", value=log_text, inline=False)
        
        await interaction.response.send_message(embed=embed, ephemeral=True)


class SetupView(discord.ui.View):
    def __init__(self, bot, guild_id):
        super().__init__()
        self.bot = bot
        self.guild_id = guild_id

    @discord.ui.button(label="➕ Adicionar Admin", style=discord.ButtonStyle.green)
    async def add_admin_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(AddAdminModal())

    @discord.ui.button(label="🛡️ Set Mod Role", style=discord.ButtonStyle.blue)
    async def set_mod_role_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(SetModRoleModal())

    @discord.ui.button(label="📝 Set Log Channel", style=discord.ButtonStyle.blurple)
    async def set_log_channel_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        await interaction.response.send_modal(SetLogChannelModal())

    @discord.ui.button(label="👀 Ver Configurações", style=discord.ButtonStyle.secondary)
    async def view_config_button(self, interaction: discord.Interaction, button: discord.ui.Button):
        guild_id = self.guild_id
        config = db.get_server_config(guild_id)
        
        admins = config.get('admins', [])
        mod_role = config.get('mod_role')
        log_channel = config.get('log_channel')
        
        admin_text = "\n".join([f"<@{admin_id}>" for admin_id in admins]) if admins else "Nenhum admin"
        mod_text = f"<@&{mod_role}>" if mod_role else "❌ Não definido"
        log_text = f"<#{log_channel}>" if log_channel else "❌ Não definido"
        
        embed = discord.Embed(
            title="⚙️ Configurações Atuais",
            color=discord.Color.blue()
        )
        embed.add_field(name="👨‍💼 Admins", value=admin_text, inline=False)
        embed.add_field(name="🛡️ Mod Role", value=mod_text, inline=False)
        embed.add_field(name="📝 Canal de Logs", value=log_text, inline=False)
        
        await interaction.response.send_message(embed=embed, ephemeral=True)


class AddAdminModal(discord.ui.Modal, title="Adicionar Admin"):
    user_input = discord.ui.TextInput(label="ID do Usuário", placeholder="Digite o ID do usuário")
    
    async def on_submit(self, interaction: discord.Interaction):
        try:
            user_id = int(self.user_input.value)
            db.add_admin(interaction.guild_id, user_id)
            
            embed = discord.Embed(
                title="✅ Admin Adicionado",
                description=f"<@{user_id}> agora é um admin!",
                color=discord.Color.green()
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
        except ValueError:
            embed = discord.Embed(
                title="❌ Erro",
                description="ID inválido!",
                color=discord.Color.red()
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)


class SetModRoleModal(discord.ui.Modal, title="Definir Mod Role"):
    role_input = discord.ui.TextInput(label="ID da Role", placeholder="Digite o ID da role")
    
    async def on_submit(self, interaction: discord.Interaction):
        try:
            role_id = int(self.role_input.value)
            db.set_mod_role(interaction.guild_id, role_id)
            
            embed = discord.Embed(
                title="✅ Mod Role Definida",
                description=f"<@&{role_id}> agora é a role de moderador!",
                color=discord.Color.green()
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
        except ValueError:
            embed = discord.Embed(
                title="❌ Erro",
                description="ID inválido!",
                color=discord.Color.red()
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)


class SetLogChannelModal(discord.ui.Modal, title="Definir Canal de Logs"):
    channel_input = discord.ui.TextInput(label="ID do Canal", placeholder="Digite o ID do canal")
    
    async def on_submit(self, interaction: discord.Interaction):
        try:
            channel_id = int(self.channel_input.value)
            db.set_log_channel(interaction.guild_id, channel_id)
            
            embed = discord.Embed(
                title="✅ Canal de Logs Definido",
                description=f"<#{channel_id}> agora receberá os logs!",
                color=discord.Color.green()
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)
        except ValueError:
            embed = discord.Embed(
                title="❌ Erro",
                description="ID inválido!",
                color=discord.Color.red()
            )
            await interaction.response.send_message(embed=embed, ephemeral=True)


async def setup(bot):
    await bot.add_cog(Setup(bot))
