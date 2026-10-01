package lk.englisher.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HerokuDatabaseUrlPostProcessorTest {

    private final HerokuDatabaseUrlPostProcessor processor = new HerokuDatabaseUrlPostProcessor();

    @Test
    void convertsHerokuUrlToJdbcWithSsl() {
        Map<String, Object> props = HerokuDatabaseUrlPostProcessor.toDatasourceProperties(
                "postgres://u1abc:p%40ss%3Aword@ec2-1-2-3-4.compute-1.amazonaws.com:5432/d9xyz");

        assertThat(props).containsEntry("spring.datasource.url",
                        "jdbc:postgresql://ec2-1-2-3-4.compute-1.amazonaws.com:5432/d9xyz?sslmode=require")
                .containsEntry("spring.datasource.username", "u1abc")
                .containsEntry("spring.datasource.password", "p@ss:word");
    }

    @Test
    void overridesDatasourceWhenDatabaseUrlIsSet() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("DATABASE_URL", "postgresql://user:secret@db.example:6543/app")
                .withProperty("spring.datasource.url", "jdbc:postgresql://localhost:5432/englisher");

        processor.postProcessEnvironment(env, null);

        assertThat(env.getProperty("spring.datasource.url")).isEqualTo("jdbc:postgresql://db.example:6543/app?sslmode=require");
        assertThat(env.getProperty("spring.datasource.password")).isEqualTo("secret");
    }

    @Test
    void explicitEnglisherDbUrlWins() {
        MockEnvironment env = new MockEnvironment()
                .withProperty("DATABASE_URL", "postgres://user:secret@db.example:5432/app")
                .withProperty("ENGLISHER_DB_URL", "jdbc:postgresql://localhost:5432/englisher");

        processor.postProcessEnvironment(env, null);

        assertThat(env.getPropertySources().contains(HerokuDatabaseUrlPostProcessor.SOURCE_NAME)).isFalse();
    }

    @Test
    void doesNothingWithoutDatabaseUrl() {
        MockEnvironment env = new MockEnvironment();
        processor.postProcessEnvironment(env, null);
        assertThat(env.getPropertySources().contains(HerokuDatabaseUrlPostProcessor.SOURCE_NAME)).isFalse();
    }

    @Test
    void rejectsNonPostgresUrl() {
        assertThatThrownBy(() -> HerokuDatabaseUrlPostProcessor.toDatasourceProperties("mysql://u:p@h:3306/d"))
                .isInstanceOf(IllegalStateException.class);
    }
}
