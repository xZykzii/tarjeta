package cl.controlcuotas.companion

import android.content.Context
import androidx.room.Room
import com.google.firebase.FirebaseApp
import com.google.firebase.FirebaseOptions
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.firestore.FirebaseFirestore
import com.google.firebase.firestore.FirebaseFirestoreSettings
import com.google.firebase.firestore.MemoryCacheSettings
import java.security.MessageDigest
import java.util.concurrent.Executors

object ConexionFirebase {
    private const val NOMBRE_APP = "cuotas-conectada"
    private const val PREFS = "consentimiento_sincronizacion"
    val executor = Executors.newSingleThreadExecutor()
    private var app: FirebaseApp? = null
    private var cola: ColaDatabase? = null
    private var hasFirestoreConfigurado = false

    fun hasConfiguracion(): Boolean = listOf(
        BuildConfig.FIREBASE_APPLICATION_ID, BuildConfig.FIREBASE_API_KEY,
        BuildConfig.FIREBASE_PROJECT_ID, BuildConfig.FIREBASE_WEB_CLIENT_ID
    ).all { it.isNotBlank() }

    @Synchronized
    fun iniciar(context: Context): Boolean {
        if (app != null) return true
        if (!hasConfiguracion()) return false
        val opciones = FirebaseOptions.Builder().setApplicationId(BuildConfig.FIREBASE_APPLICATION_ID)
            .setApiKey(BuildConfig.FIREBASE_API_KEY).setProjectId(BuildConfig.FIREBASE_PROJECT_ID).build()
        app = FirebaseApp.initializeApp(context.applicationContext, opciones, NOMBRE_APP)
        return true
    }

    fun auth(): FirebaseAuth = FirebaseAuth.getInstance(requireNotNull(app))

    fun uid(): String? = if (app == null) null else auth().currentUser
        ?.takeUnless { it.isAnonymous }?.uid

    @Synchronized
    fun db(context: Context): ColaDatabase {
        if (cola == null) cola = Room.databaseBuilder(context.applicationContext,
            ColaDatabase::class.java, "capturas-por-cuenta.db").build()
        return requireNotNull(cola)
    }

    @Synchronized
    fun remoto(): FirebaseFirestore {
        val instancia = FirebaseFirestore.getInstance(requireNotNull(app))
        if (!hasFirestoreConfigurado) {
            instancia.firestoreSettings = FirebaseFirestoreSettings.Builder()
                .setLocalCacheSettings(MemoryCacheSettings.newBuilder().build()).build()
            hasFirestoreConfigurado = true
        }
        return instancia
    }

    fun puedeEnviar(context: Context, uid: String): Boolean =
        uid() == uid && ConsentimientoLocal.hasConsentimiento(context) &&
            context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("sync_$uid", false)

    fun consentir(context: Context, uid: String, puede: Boolean) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean("sync_$uid", puede)
            .putLong("desde_$uid", if (puede) System.currentTimeMillis() else 0L).apply()
        if (!puede) TrabajoCapturas.cancelar(context, uid)
    }

    fun autorizadaDesde(context: Context, uid: String): Long =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getLong("desde_$uid", Long.MAX_VALUE)

    fun error(context: Context, uid: String, codigo: String) {
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putString("error_$uid", codigo).apply()
    }

    fun ultimoError(context: Context, uid: String): String =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("error_$uid", "") ?: ""

    fun hash(valor: String): String = MessageDigest.getInstance("SHA-256")
        .digest(valor.toByteArray(Charsets.UTF_8)).joinToString("") { "%02x".format(it) }
}
