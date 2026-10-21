package cl.controlcuotas.companion;

import androidx.annotation.NonNull;
import androidx.room.Dao;
import androidx.room.Database;
import androidx.room.Entity;
import androidx.room.Index;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.PrimaryKey;
import androidx.room.Query;
import androidx.room.RoomDatabase;
import androidx.room.Transaction;
import java.util.List;

/** Solo datos normalizados y tombstones de identidad. Sin textos brutos ni nombres. */
@Database(entities = {ColaDatabase.Captura.class}, version = 1, exportSchema = true)
public abstract class ColaDatabase extends RoomDatabase {
    public abstract CapturasDao capturas();

    @Entity(tableName = "capturas", indices = {
        @Index(value = {"uid", "claveHash", "postTime", "huellaDatos"}, unique = true),
        @Index(value = {"uid", "estado"})
    })
    public static class Captura {
        @PrimaryKey @NonNull public String eventId;
        @NonNull public String uid;
        @NonNull public String claveHash;
        @NonNull public String huellaDatos;
        public long postTime;
        public long recibidaEn;
        public long montoOriginal;
        @NonNull public String comercio;
        @NonNull public String tarjetaUltimos4;
        @NonNull public String parserVersion;
        @NonNull public String estado;

        public Captura(@NonNull String eventId, @NonNull String uid, @NonNull String claveHash,
                       @NonNull String huellaDatos, long postTime, long recibidaEn, long montoOriginal,
                       @NonNull String comercio, @NonNull String tarjetaUltimos4,
                       @NonNull String parserVersion, @NonNull String estado) {
            this.eventId = eventId;
            this.uid = uid;
            this.claveHash = claveHash;
            this.huellaDatos = huellaDatos;
            this.postTime = postTime;
            this.recibidaEn = recibidaEn;
            this.montoOriginal = montoOriginal;
            this.comercio = comercio;
            this.tarjetaUltimos4 = tarjetaUltimos4;
            this.parserVersion = parserVersion;
            this.estado = estado;
        }
    }

    @Dao
    public abstract static class CapturasDao {
        @Insert(onConflict = OnConflictStrategy.IGNORE)
        public abstract long insertar(Captura captura);

        @Query("SELECT COUNT(*) FROM capturas WHERE uid = :uid")
        public abstract int cantidad(String uid);

        @Query("SELECT COUNT(*) FROM capturas WHERE uid = :uid AND estado = 'pendiente'")
        public abstract int pendientes(String uid);

        @Query("SELECT * FROM capturas WHERE uid = :uid AND estado = 'pendiente' ORDER BY recibidaEn LIMIT :limite")
        public abstract List<Captura> lote(String uid, int limite);

        @Query("SELECT COUNT(*) FROM capturas WHERE uid = :uid AND claveHash = :clave AND postTime = :postTime AND huellaDatos = :huella")
        public abstract int identidad(String uid, String clave, long postTime, String huella);

        @Query("UPDATE capturas SET estado = 'enviada', montoOriginal = 0, comercio = '', tarjetaUltimos4 = '', parserVersion = '', recibidaEn = 0 WHERE uid = :uid AND eventId = :eventId")
        public abstract int enviada(String uid, String eventId);

        @Query("DELETE FROM capturas WHERE uid = :uid AND estado = 'pendiente'")
        public abstract int eliminarPendientes(String uid);

        @Transaction
        public long encolar(Captura captura, int limite) {
            if (identidad(captura.uid, captura.claveHash, captura.postTime, captura.huellaDatos) > 0) return -1;
            if (cantidad(captura.uid) >= limite) throw new IllegalStateException("Límite local de avisos alcanzado");
            long resultado = insertar(captura);
            if (resultado < 0) throw new IllegalStateException("Identidad local en conflicto");
            return resultado;
        }
    }
}
