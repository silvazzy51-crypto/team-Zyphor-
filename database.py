import sqlite3
import json
from datetime import datetime

class Database:
    def __init__(self, db_name="bot_data.db"):
        self.db_name = db_name
        self.init_db()

    def init_db(self):
        """Inicializar banco de dados com todas as tabelas"""
        conn = sqlite3.connect(self.db_name)
        cursor = conn.cursor()

        # Tabela de warns
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS warns (
                id INTEGER PRIMARY KEY,
                guild_id INTEGER,
                user_id INTEGER,
                moderator_id INTEGER,
                reason TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Tabela de mutes
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS mutes (
                id INTEGER PRIMARY KEY,
                guild_id INTEGER,
                user_id INTEGER,
                moderator_id INTEGER,
                reason TEXT,
                end_time DATETIME,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Tabela de blacklist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS blacklist (
                id INTEGER PRIMARY KEY,
                guild_id INTEGER,
                word TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Tabela de whitelist
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS whitelist (
                id INTEGER PRIMARY KEY,
                guild_id INTEGER,
                word TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Tabela de logs
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS modlogs (
                id INTEGER PRIMARY KEY,
                guild_id INTEGER,
                user_id INTEGER,
                action TEXT,
                reason TEXT,
                moderator_id INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Tabela de configurações do servidor
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS server_config (
                guild_id INTEGER PRIMARY KEY,
                admins TEXT DEFAULT '[]',
                mod_role INTEGER,
                log_channel INTEGER,
                antiraid_enabled BOOLEAN DEFAULT 1,
                antispam_enabled BOOLEAN DEFAULT 1,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # Tabela de raid log
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS raid_log (
                id INTEGER PRIMARY KEY,
                guild_id INTEGER,
                user_id INTEGER,
                action TEXT,
                reason TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        conn.close()

    def _get_connection(self):
        """Obter conexão com banco de dados"""
        return sqlite3.connect(self.db_name)

    # ===== ADMINS =====
    def add_admin(self, guild_id, user_id):
        """Adicionar admin"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        config = self.get_server_config(guild_id)
        admins = config.get('admins', [])
        
        if user_id not in admins:
            admins.append(user_id)
            cursor.execute("""
                INSERT OR REPLACE INTO server_config (guild_id, admins)
                VALUES (?, ?)
            """, (guild_id, json.dumps(admins)))
            conn.commit()
        
        conn.close()

    def remove_admin(self, guild_id, user_id):
        """Remover admin"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        config = self.get_server_config(guild_id)
        admins = config.get('admins', [])
        
        if user_id in admins:
            admins.remove(user_id)
            cursor.execute("""
                INSERT OR REPLACE INTO server_config (guild_id, admins)
                VALUES (?, ?)
            """, (guild_id, json.dumps(admins)))
            conn.commit()
        
        conn.close()

    def get_admins(self, guild_id):
        """Obter lista de admins"""
        config = self.get_server_config(guild_id)
        return config.get('admins', [])

    def is_admin(self, guild_id, user_id):
        """Verificar se é admin"""
        admins = self.get_admins(guild_id)
        return user_id in admins

    # ===== CONFIGURAÇÕES DO SERVIDOR =====
    def get_server_config(self, guild_id):
        """Obter configurações do servidor"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT admins, mod_role, log_channel, antiraid_enabled, antispam_enabled
            FROM server_config
            WHERE guild_id = ?
        """, (guild_id,))
        
        result = cursor.fetchone()
        conn.close()
        
        if result:
            return {
                'admins': json.loads(result[0]),
                'mod_role': result[1],
                'log_channel': result[2],
                'antiraid_enabled': result[3],
                'antispam_enabled': result[4]
            }
        return {
            'admins': [],
            'mod_role': None,
            'log_channel': None,
            'antiraid_enabled': True,
            'antispam_enabled': True
        }

    def set_mod_role(self, guild_id, role_id):
        """Definir mod role"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO server_config (guild_id, mod_role)
            VALUES (?, ?)
        """, (guild_id, role_id))
        
        conn.commit()
        conn.close()

    def set_log_channel(self, guild_id, channel_id):
        """Definir canal de logs"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT OR REPLACE INTO server_config (guild_id, log_channel)
            VALUES (?, ?)
        """, (guild_id, channel_id))
        
        conn.commit()
        conn.close()

    # ===== WARNS =====
    def add_warn(self, guild_id, user_id, moderator_id, reason):
        """Adicionar warn"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO warns (guild_id, user_id, moderator_id, reason)
            VALUES (?, ?, ?, ?)
        """, (guild_id, user_id, moderator_id, reason))
        
        conn.commit()
        conn.close()

    def get_warns(self, guild_id, user_id):
        """Obter warns de um usuário"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) FROM warns
            WHERE guild_id = ? AND user_id = ?
        """, (guild_id, user_id))
        
        result = cursor.fetchone()
        conn.close()
        
        return result[0] if result else 0

    def clear_warns(self, guild_id, user_id):
        """Limpar warns de um usuário"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            DELETE FROM warns
            WHERE guild_id = ? AND user_id = ?
        """, (guild_id, user_id))
        
        conn.commit()
        conn.close()

    # ===== BLACKLIST/WHITELIST =====
    def add_blacklist(self, guild_id, word):
        """Adicionar palavra ao blacklist"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO blacklist (guild_id, word)
            VALUES (?, ?)
        """, (guild_id, word.lower()))
        
        conn.commit()
        conn.close()

    def remove_blacklist(self, guild_id, word):
        """Remover palavra do blacklist"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            DELETE FROM blacklist
            WHERE guild_id = ? AND word = ?
        """, (guild_id, word.lower()))
        
        conn.commit()
        conn.close()

    def get_blacklist(self, guild_id):
        """Obter blacklist do servidor"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT word FROM blacklist
            WHERE guild_id = ?
        """, (guild_id,))
        
        result = cursor.fetchall()
        conn.close()
        
        return [word[0] for word in result]

    def add_whitelist(self, guild_id, word):
        """Adicionar palavra ao whitelist"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO whitelist (guild_id, word)
            VALUES (?, ?)
        """, (guild_id, word.lower()))
        
        conn.commit()
        conn.close()

    def remove_whitelist(self, guild_id, word):
        """Remover palavra do whitelist"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            DELETE FROM whitelist
            WHERE guild_id = ? AND word = ?
        """, (guild_id, word.lower()))
        
        conn.commit()
        conn.close()

    def get_whitelist(self, guild_id):
        """Obter whitelist do servidor"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT word FROM whitelist
            WHERE guild_id = ?
        """, (guild_id,))
        
        result = cursor.fetchall()
        conn.close()
        
        return [word[0] for word in result]

    # ===== LOGS =====
    def add_modlog(self, guild_id, user_id, action, reason, moderator_id):
        """Adicionar log de moderação"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO modlogs (guild_id, user_id, action, reason, moderator_id)
            VALUES (?, ?, ?, ?, ?)
        """, (guild_id, user_id, action, reason, moderator_id))
        
        conn.commit()
        conn.close()

    def get_modlogs(self, guild_id, user_id=None, limit=10):
        """Obter logs de moderação"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        if user_id:
            cursor.execute("""
                SELECT user_id, action, reason, moderator_id, timestamp
                FROM modlogs
                WHERE guild_id = ? AND user_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (guild_id, user_id, limit))
        else:
            cursor.execute("""
                SELECT user_id, action, reason, moderator_id, timestamp
                FROM modlogs
                WHERE guild_id = ?
                ORDER BY timestamp DESC
                LIMIT ?
            """, (guild_id, limit))
        
        result = cursor.fetchall()
        conn.close()
        
        return result

    # ===== RAID LOG =====
    def add_raid_log(self, guild_id, user_id, action, reason):
        """Adicionar log de raid"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO raid_log (guild_id, user_id, action, reason)
            VALUES (?, ?, ?, ?)
        """, (guild_id, user_id, action, reason))
        
        conn.commit()
        conn.close()

    # ===== MUTES =====
    def add_mute(self, guild_id, user_id, moderator_id, reason, end_time):
        """Adicionar mute"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            INSERT INTO mutes (guild_id, user_id, moderator_id, reason, end_time)
            VALUES (?, ?, ?, ?, ?)
        """, (guild_id, user_id, moderator_id, reason, end_time))
        
        conn.commit()
        conn.close()

    def remove_mute(self, guild_id, user_id):
        """Remover mute"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            DELETE FROM mutes
            WHERE guild_id = ? AND user_id = ?
        """, (guild_id, user_id))
        
        conn.commit()
        conn.close()

    def is_muted(self, guild_id, user_id):
        """Verificar se está mutado"""
        conn = self._get_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT COUNT(*) FROM mutes
            WHERE guild_id = ? AND user_id = ?
        """, (guild_id, user_id))
        
        result = cursor.fetchone()
        conn.close()
        
        return result[0] > 0 if result else False
