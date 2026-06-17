# ==================================================================================
# SurgiBot evaluation: Analysis of the UX part of the questionnaire
# Author: Lana Cvijic
# Bern University of Applied Sciences, Institute for Patient-centered Digital Health
# ==================================================================================

# Step 1: Install and load the required packages
  # REMARK: Packages need to be installed only once on every machine that runs this script.
  # The following command can be used to install the packages: 
  # install.packages(c("readxl", "tidyverse", "fmsb", "scales"))

library(readxl)
library(fmsb)
library(tidyverse)
library(scales)

# Step 2: Read the Excel file
  # REMARK: This path needs to be adjusted when executing the script on another machine.
  # Choose the path where you saved the "Evaluation_of_SurgiBot.xlsx" file
setwd("~/Desktop/MSE/Semesters/02 Semester/EVA Project/Data analysis with R")

df_raw <- read_excel("Evaluation_of_SurgiBot.xlsx", sheet = 1)

names(df_raw) <- names(df_raw) %>%
  str_replace_all("[\r\n]", " ") %>%
  str_squish()

print(names(df_raw))

# Step 3: Rename the UX-related columns
df_ux <- df_raw %>%
  rename(
    id = `ID`,
    ux_enjoy = `I enjoyed using SurgiBot as a learning tool.`,
    ux_positive_again = `I would feel positive about using SurgiBot again.`,
    ux_too_much_effort = `Using SurgiBot required too much effort for the benefit I received.`,
    ux_fits_schedule = `I could realistically fit SurgiBot into a busy training schedule.`,
    ux_understand = `I understand what SurgiBot does and how it is supposed to help learning.`,
    ux_feedback_clear = `The purpose of the feedback and scoring was clear to me.`,
    ux_improves_skills = `SurgiBot is likely to improve informed consent communication skills with repeated use.`,
    ux_measurable_improve = `The feedback is likely to lead to measurable improvement over time.`,
    ux_confident_solo = `I feel confident I could use SurgiBot to practice effectively on my own.`,
    ux_takes_time_away = `Using SurgiBot would take time away from other more valuable training activities.`,
    ux_value_justified = `SurgiBot provides enough value to justify the time spent.`,
    ux_ethical = `Using SurgiBot for training feels appropriate and ethically acceptable in medical education.`,
    ux_institution_rec = `I would be comfortable with SurgiBot being recommended in my institution.`
  )

# Step 4: Define the UX-related columns
ux_cols <- c(
  "ux_enjoy",
  "ux_positive_again",
  "ux_too_much_effort",
  "ux_fits_schedule",
  "ux_understand",
  "ux_feedback_clear",
  "ux_improves_skills",
  "ux_measurable_improve",
  "ux_confident_solo",
  "ux_takes_time_away",
  "ux_value_justified",
  "ux_ethical",
  "ux_institution_rec"
)

# Step 5: Convert the Likert answers to numerical values 1-5
likert_levels <- c(
  "Strongly disagree",
  "Disagree",
  "Neutral",
  "Agree",
  "Strongly agree"
)

to_likert_num <- function(x) {
  factor(x, levels = likert_levels) %>% as.integer()
}

df_ux_num <- df_ux %>%
  mutate(across(all_of(ux_cols), to_likert_num))

# Step 6: Reverse-code 2 negative items within the UX questions
# Negative items:
# - Using SurgiBot required too much effort for the benefit I received.
# - Using SurgiBot would take time away from other more valuable training activities.
#
# Formula:
# new value = 6 - original value

df_ux_radar <- df_ux_num %>%
  mutate(
    ux_too_much_effort = 6 - ux_too_much_effort,
    ux_takes_time_away = 6 - ux_takes_time_away
  )

# Step 7: Calculate mean values for each column
ux_means <- df_ux_radar %>%
  summarise(across(
    all_of(ux_cols),
    ~ round(mean(.x, na.rm = TRUE), 2)
  ))

# Step 8: Define short column names that will be used in the radar chart .png
colnames(ux_means) <- c(
  "Enjoyment",
  "Use again",
  "Low effort",
  "Schedule fit",
  "Purpose clear",
  "Feedback clear",
  "Skill improvement",
  "Measurable gain",
  "Self-practice",
  "No time loss",
  "Provided value",
  "Ethics",
  "Institutional use"
)

# Step 9: Prepare the data for radar chart
radar_data <- rbind(
  rep(5, ncol(ux_means)), # Max value is 5
  rep(1, ncol(ux_means)), # Min value is 1
  ux_means # Actual mean values calculated above
)

radar_data <- as.data.frame(radar_data)

# Step 10: Create and save the radar chart
png(
  filename = "surgibot_ux_radar_chart.png",
  width = 2200,
  height = 2000,
  res = 300
)

par(
  mar = c(3, 4, 6, 4),
  oma = c(1, 1, 1, 1)
)

radarchart(
  radar_data,
  axistype = 1,
  pcol = "#2c7bb6",
  pfcol = scales::alpha("#2c7bb6", 0.20),
  plwd = 3,
  plty = 1,
  cglcol = "grey75",
  cglty = 1,
  cglwd = 0.8,
  axislabcol = "grey30",
  caxislabels = c("1", "2", "3", "4", "5"),
  vlcex = 0.65,
  title = "User experience (UX) ratings for SurgiBot"
)

mtext(
  "Mean Likert scores",
  side = 3,
  line = 1,
  cex = 0.8,
  col = "grey30"
)

dev.off()

cat("Radar chart was successfully saved as surgibot_ux_radar_chart.png\n")
