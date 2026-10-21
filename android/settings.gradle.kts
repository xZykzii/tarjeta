pluginManagement {
    repositories { google(); mavenCentral(); gradlePluginPortal() }
    plugins {
        id("com.android.application") version "8.9.2"
        kotlin("android") version "2.2.21"
        kotlin("jvm") version "2.2.21"
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories { google(); mavenCentral() }
}
rootProject.name = "CuotasCompanion"
include(":core")
// Permite verificar el dominio antes de instalar el SDK Android.
if (providers.gradleProperty("soloNucleo").orNull != "true") include(":app")
