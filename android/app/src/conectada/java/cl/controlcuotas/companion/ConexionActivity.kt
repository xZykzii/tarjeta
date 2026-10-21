package cl.controlcuotas.companion

import android.app.Activity
import android.os.Bundle
import android.widget.Button
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.Switch
import android.widget.TextView
import androidx.credentials.ClearCredentialStateRequest
import androidx.credentials.CredentialManager
import androidx.credentials.CredentialManagerCallback
import androidx.credentials.GetCredentialRequest
import androidx.credentials.GetCredentialResponse
import androidx.credentials.exceptions.ClearCredentialException
import androidx.credentials.exceptions.GetCredentialException
import androidx.credentials.exceptions.NoCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.auth.GoogleAuthProvider

private const val PADDING_PANTALLA_DP = 24
private const val ALTURA_CONTROL_DP = 52
private const val TEXTO_PUNTOS = 16f

class ConexionActivity : Activity() {
    private lateinit var estado: TextView
    private lateinit var cuenta: TextView
    private lateinit var consentimiento: Switch
    private lateinit var entrar: Button
    private lateinit var salir: Button
    private lateinit var reintentar: Button
    private var isRenderizando = false
    private var isEntrando = false
    private val escucha = FirebaseAuth.AuthStateListener { render() }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        crearPantalla()
        if (ConexionFirebase.iniciar(this)) {
            entrar.setOnClickListener { acceder() }
            salir.setOnClickListener { cerrarSesion() }
            reintentar.setOnClickListener {
                ConexionFirebase.uid()?.let { uid ->
                    if (ConexionFirebase.puedeEnviar(this, uid)) TrabajoCapturas.solicitar(this, uid)
                }
                render()
            }
        }
        consentimiento.setOnCheckedChangeListener { _, puede ->
            val uid = ConexionFirebase.uid()
            if (!isRenderizando && uid != null) {
                ConexionFirebase.consentir(this, uid, puede && ConsentimientoLocal.hasConsentimiento(this))
                if (puede) TrabajoCapturas.solicitar(this, uid)
                render()
            }
        }
        render()
    }

    private fun crearPantalla() {
        val layout = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            val padding = (PADDING_PANTALLA_DP * resources.displayMetrics.density).toInt()
            setPadding(padding, padding, padding, padding)
            fitsSystemWindows = true
        }
        fun texto(valor: String) = TextView(this).apply { text = valor; textSize = TEXTO_PUNTOS; layout.addView(this) }
        fun boton(valor: String) = Button(this).apply {
            text = valor; isAllCaps = false
            minimumHeight = (ALTURA_CONTROL_DP * resources.displayMetrics.density).toInt()
            layout.addView(this)
        }
        texto("Cuenta y sincronización").textSize = 26f
        texto("Usa el mismo Google que en la web. Los avisos se guardan en tu bandeja privada para revisarlos; nunca crean deuda automáticamente.")
        cuenta = texto("")
        entrar = boton("Vincular mi Google")
        salir = boton("Cerrar sesión en este teléfono")
        texto("Al autorizar, se conservarán importe, comercio, terminación e identidad del aviso en una cola privada de esta cuenta. Con conexión se enviarán a tu espacio de Firebase. No se envían nombres del adicional ni texto original.")
        consentimiento = Switch(this).apply { text = "Guardar y enviar nuevos avisos a mi bandeja"; layout.addView(this) }
        texto("Pausar o salir detiene nuevos envíos; uno ya iniciado podría completarse. La cola de otra cuenta no se reasigna. Los datos financieros se limpian de la cola al confirmarse el envío; la última detección puede seguir visible en memoria hasta limpiarla.")
        estado = texto("")
        reintentar = boton("Reintentar envío de mi cola")
        boton("Actualizar estado").setOnClickListener { render() }
        boton("Volver al diagnóstico").setOnClickListener { finish() }
        setContentView(ScrollView(this).apply { fitsSystemWindows = true; addView(layout) })
    }

    override fun onStart() {
        super.onStart()
        if (ConexionFirebase.hasConfiguracion()) ConexionFirebase.auth().addAuthStateListener(escucha)
    }

    override fun onStop() {
        if (ConexionFirebase.hasConfiguracion()) ConexionFirebase.auth().removeAuthStateListener(escucha)
        super.onStop()
    }

    private fun render() {
        val hasConfig = ConexionFirebase.hasConfiguracion()
        val uid = ConexionFirebase.uid()
        val puede = uid != null && ConexionFirebase.puedeEnviar(this, uid)
        isRenderizando = true
        consentimiento.isChecked = puede
        consentimiento.isEnabled = uid != null && ConsentimientoLocal.hasConsentimiento(this) && !isEntrando
        isRenderizando = false
        entrar.isEnabled = hasConfig && !isEntrando && uid == null
        salir.isEnabled = uid != null && !isEntrando
        reintentar.isEnabled = puede && !isEntrando
        cuenta.text = if (uid != null) "Cuenta: ${ConexionFirebase.auth().currentUser?.email ?: "Google vinculado"}."
            else "Sin cuenta vinculada. No se conservan nuevos avisos en la cola."
        estado.text = if (!hasConfig) "La conexión aún no está habilitada en esta versión. Puedes seguir usando el diagnóstico."
            else if (uid == null) "Vincula tu cuenta y autoriza el envío por separado."
            else if (!puede) "Envío pausado. Activa el diagnóstico y autoriza guardar/enviar para continuar."
            else "Consultando tu cola…"
        if (uid != null) consultarCola(uid, puede)
    }

    private fun consultarCola(uid: String, puede: Boolean) {
        ConexionFirebase.executor.execute {
            try {
                val cantidad = ConexionFirebase.db(this).capturas().pendientes(uid)
                val codigo = ConexionFirebase.ultimoError(this, uid)
                runOnUiThread {
                    if (!isFinishing && ConexionFirebase.uid() == uid) {
                        estado.text = "Avisos pendientes de envío: $cantidad. " +
                            if (codigo.isNotEmpty()) "Hay un envío o guardado por revisar. Comprueba acceso y conexión; puedes reintentar."
                            else if (puede) "El envío se confirma al responder el servidor. Actualiza esta pantalla para comprobarlo."
                            else "El envío está pausado."
                    }
                }
            } catch (error: RuntimeException) {
                runOnUiThread { if (ConexionFirebase.uid() == uid) estado.text = "No se pudo consultar la cola local. No se ha confirmado su envío." }
            }
        }
    }

    private fun acceder() {
        if (isEntrando || !ConexionFirebase.hasConfiguracion()) return
        isEntrando = true
        render()
        val opcion = GetGoogleIdOption.Builder().setServerClientId(BuildConfig.FIREBASE_WEB_CLIENT_ID)
            .setFilterByAuthorizedAccounts(false).setAutoSelectEnabled(false).build()
        val solicitud = GetCredentialRequest.Builder().addCredentialOption(opcion).build()
        try {
            CredentialManager.create(this).getCredentialAsync(this, solicitud, null, mainExecutor,
                object : CredentialManagerCallback<GetCredentialResponse, GetCredentialException> {
                    override fun onResult(resultado: GetCredentialResponse) { vincular(resultado) }
                override fun onError(error: GetCredentialException) {
                    falloAcceso()
                    if (error is NoCredentialException) estado.text = "Google no ofreció una cuenta. Revisa las cuentas del teléfono y vuelve a intentar."
                }
                })
        } catch (error: RuntimeException) { falloAcceso() }
    }

    private fun vincular(resultado: GetCredentialResponse) {
        try {
            val credencial = resultado.credential
            if (credencial.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL) {
                falloAcceso()
                return
            }
            val token = GoogleIdTokenCredential.createFrom(credencial.data).idToken
            ConexionFirebase.auth().signInWithCredential(GoogleAuthProvider.getCredential(token, null))
                .addOnCompleteListener(this) { tarea ->
                    isEntrando = false
                    render()
                    if (!tarea.isSuccessful) estado.text = "No se pudo vincular Google. No se habilitó ningún envío."
                }
        } catch (error: Exception) { falloAcceso() }
    }

    private fun falloAcceso() {
        isEntrando = false
        render()
        estado.text = "Acceso cancelado o no disponible. No se habilitó ningún envío."
    }

    private fun cerrarSesion() {
        ConexionFirebase.uid()?.let { ConexionFirebase.consentir(this, it, false) }
        ConexionFirebase.auth().signOut()
        CredentialManager.create(this).clearCredentialStateAsync(ClearCredentialStateRequest(), null, mainExecutor,
            object : CredentialManagerCallback<Void?, ClearCredentialException> {
                override fun onResult(result: Void?) { render() }
                override fun onError(error: ClearCredentialException) {
                    render()
                    estado.text = "La sesión de esta app se cerró. Google podría seguir ofreciendo la cuenta en su selector."
                }
            })
        render()
    }
}
