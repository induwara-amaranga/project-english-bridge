package lk.englisher.progress;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * The pure, static pieces of {@link ProgressService} — the level curve and the
 * streak-freeze branch. Both are written the same way {@code nextStreak} was
 * (static, package-visible, no {@link ProgressEntity} needed) specifically so
 * they can be tested like this.
 */
class ProgressServiceTest {

    private static final Instant DAY_ZERO = Instant.parse("2024-01-01T00:00:00Z");

    private static Instant days(int n) {
        return DAY_ZERO.plus(n, ChronoUnit.DAYS);
    }

    @Nested
    @DisplayName("nextStreak — unchanged existing behaviour")
    class NextStreak {
        @Test
        @DisplayName("a second lesson the same day does not extend the streak")
        void sameDayHolds() {
            assertThat(ProgressService.nextStreak(3, days(0), days(0))).isEqualTo(3);
        }

        @Test
        @DisplayName("a lesson with no prior activity floors the streak at 1")
        void sameDayFloorsAtOne() {
            assertThat(ProgressService.nextStreak(0, days(0), days(0))).isEqualTo(1);
        }

        @Test
        @DisplayName("exactly one day's gap continues the streak")
        void oneDayGapContinues() {
            assertThat(ProgressService.nextStreak(3, days(0), days(1))).isEqualTo(4);
        }

        @Test
        @DisplayName("more than one day's gap resets the streak")
        void longerGapResets() {
            assertThat(ProgressService.nextStreak(9, days(0), days(3))).isEqualTo(1);
        }
    }

    @Nested
    @DisplayName("applyStreak — the freeze-consuming wrapper around nextStreak")
    class ApplyStreak {
        @Test
        @DisplayName("no freeze available: falls through to nextStreak's reset, and records the broken streak")
        void noFreezeFallsThrough() {
            var result = ProgressService.applyStreak(5, 0, days(0), days(3));
            assertThat(result.streak()).isEqualTo(1);
            assertThat(result.streakFreezes()).isZero();
            assertThat(result.brokenStreakValue()).isEqualTo(5);
        }

        @Test
        @DisplayName("a streak of 1 breaking again is not worth a repair offer")
        void breakingAStreakOfOneIsNotRecorded() {
            var result = ProgressService.applyStreak(1, 0, days(0), days(3));
            assertThat(result.streak()).isEqualTo(1);
            assertThat(result.brokenStreakValue()).isZero();
        }

        @Test
        @DisplayName("one missed day costs exactly one freeze")
        void oneMissedDayCostsOneFreeze() {
            // days(0) -> days(2) is a two-calendar-day gap, i.e. one missed day.
            var result = ProgressService.applyStreak(5, 2, days(0), days(2));
            assertThat(result.streak()).isEqualTo(6);
            assertThat(result.streakFreezes()).isEqualTo(1);
            assertThat(result.brokenStreakValue()).isZero();
        }

        @Test
        @DisplayName("five missed days need five freezes, not one")
        void fiveMissedDaysNeedFiveFreezes() {
            var result = ProgressService.applyStreak(5, 5, days(0), days(6));
            assertThat(result.streak()).isEqualTo(6);
            assertThat(result.streakFreezes()).isZero();
        }

        @Test
        @DisplayName("not enough freezes for the whole gap resets the streak and spends none of them")
        void insufficientFreezesForTheWholeGapResets() {
            var result = ProgressService.applyStreak(5, 2, days(0), days(6));
            assertThat(result.streak()).isEqualTo(1);
            assertThat(result.streakFreezes()).isEqualTo(2);
            assertThat(result.brokenStreakValue()).isEqualTo(5);
        }

        @Test
        @DisplayName("a one-day gap never touches the freeze count — nextStreak already continues it")
        void oneDayGapDoesNotSpendAFreeze() {
            var result = ProgressService.applyStreak(5, 2, days(0), days(1));
            assertThat(result.streak()).isEqualTo(6);
            assertThat(result.streakFreezes()).isEqualTo(2);
        }
    }

    @Nested
    @DisplayName("levelInfo — the xp -> level curve")
    class LevelInfoTest {
        @Test
        @DisplayName("0 xp is level 1, needing 50 to level up")
        void startsAtLevelOne() {
            var info = ProgressService.levelInfo(0);
            assertThat(info.level()).isEqualTo(1);
            assertThat(info.xpIntoLevel()).isZero();
            assertThat(info.xpForNextLevel()).isEqualTo(50);
        }

        @Test
        @DisplayName("49 xp is still level 1")
        void justBelowThresholdStaysAtLevel() {
            var info = ProgressService.levelInfo(49);
            assertThat(info.level()).isEqualTo(1);
            assertThat(info.xpIntoLevel()).isEqualTo(49);
        }

        @Test
        @DisplayName("50 xp reaches level 2, with nothing yet into it")
        void exactThresholdLevelsUp() {
            var info = ProgressService.levelInfo(50);
            assertThat(info.level()).isEqualTo(2);
            assertThat(info.xpIntoLevel()).isZero();
        }

        @Test
        @DisplayName("levels 1-3 cost 50 each, so 150 xp is exactly level 4")
        void firstThreeLevelsAreFlat() {
            assertThat(ProgressService.levelInfo(150).level()).isEqualTo(4);
            assertThat(ProgressService.levelCost(1)).isEqualTo(50);
            assertThat(ProgressService.levelCost(2)).isEqualTo(50);
            assertThat(ProgressService.levelCost(3)).isEqualTo(50);
        }

        @Test
        @DisplayName("costs grow after level 3, so leveling visibly slows down")
        void growsAfterLevelThree() {
            assertThat(ProgressService.levelCost(4)).isEqualTo(75);
            assertThat(ProgressService.levelCost(5)).isEqualTo(100);
            assertThat(ProgressService.levelCost(6)).isEqualTo(125);
        }
    }
}
