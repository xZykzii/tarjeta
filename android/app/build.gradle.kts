import java.util.Properties

plugins {
    id("com.android.application")
    kotlin("android")
}
val conexion = Properties().apply {
    val archivo = rootProject.file("sincronizacion.properties")
    if (archivo.isFile) archivo.inputStream().use { load(it) }
}
fun config(nombre: String): String = "\"" + conexion.getProperty(nombre, "").replace("\\", "\\\\").replace("\"", "\\\"") + "\""
android {
    namespace = "cl.controlcuotas.companion"
    compileSdk = 35
    defaultConfig {
        applicationId = "cl.controlcuotas.companion"
        minSdk = 28
        targetSdk = 35
        versionCode = 2
        versionName = "0.1.1-diagnostico"
    }
    buildFeatures { buildConfig = true }
    flavorDimensions += "modo"
    productFlavors {
        create("diagnostico") {
            dimension = "modo"
            buildConfigField("boolean", "IS_CONECTADA", "false")
        }
        create("conectada") {
            dimension = "modo"
            applicationIdSuffix = ".sync"
            versionCode = 4
            versionName = "0.2.1"
            buildConfigField("boolean", "IS_CONECTADA", "true")
            listOf("APPLICATION_ID", "API_KEY", "PROJECT_ID", "WEB_CLIENT_ID").forEach {
                buildConfigField("String", "FIREBASE_$it", config(it))
            }
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildTypes {
        release { isMinifyEnabled = false }
    }
    testOptions { unitTests.isIncludeAndroidResources = true }
    defaultConfig.javaCompileOptions.annotationProcessorOptions.arguments["room.schemaLocation"] = file("schemas").path
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
dependencies {
    implementation(project(":core"))
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.14.1")
    "conectadaImplementation"(platform("com.google.firebase:firebase-bom:34.4.0"))
    "conectadaImplementation"("com.google.firebase:firebase-auth")
    "conectadaImplementation"("com.google.firebase:firebase-firestore")
    "conectadaImplementation"("androidx.room:room-runtime:2.7.2")
    "conectadaAnnotationProcessor"("androidx.room:room-compiler:2.7.2")
    "conectadaImplementation"("androidx.work:work-runtime:2.10.1")
    "testConectadaImplementation"("androidx.work:work-testing:2.10.1")
    "conectadaImplementation"("androidx.credentials:credentials:1.5.0")
    "conectadaImplementation"("androidx.credentials:credentials-play-services-auth:1.5.0")
    "conectadaImplementation"("com.google.android.libraries.identity.googleid:googleid:1.1.1")
}
