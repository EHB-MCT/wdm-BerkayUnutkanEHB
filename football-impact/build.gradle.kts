plugins { kotlin("jvm") version "1.9.24"; application }
repositories { mavenCentral() }
dependencies { implementation("com.github.doyaaaaaken:kotlin-csv-jvm:1.9.3") }
application { mainClass.set("MainKt") }
kotlin { jvmToolchain(17) }
