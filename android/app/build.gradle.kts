plugins {
    id("com.android.application")
    kotlin("android")
}
android {
    namespace = "cl.controlcuotas.companion"
    compileSdk = 35
    defaultConfig {
        applicationId = "cl.controlcuotas.companion"
        minSdk = 28
        targetSdk = 35
        versionCode = 1
        versionName = "0.1.0-diagnostico"
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    buildTypes {
        release { isMinifyEnabled = false }
    }
    testOptions { unitTests.isIncludeAndroidResources = true }
}
kotlin { compilerOptions { jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17) } }
dependencies {
    implementation(project(":core"))
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.14.1")
}
