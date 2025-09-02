import Team from "../models/team-Model";

/**
 * Generates a unique 6-character team code
 * @returns Promise<string> - Unique team code
 */
export const generate_team_code = async (): Promise<string> => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let attempts = 0;
  const max_attempts = 100;

  while (attempts < max_attempts) {
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    // Check if code already exists
    const existing_team = await Team.findOne({ code });
    if (!existing_team) {
      return code;
    }

    attempts++;
  }

  throw new Error("Failed to generate unique team code after maximum attempts");
};

/**
 * Validates a team code format
 * @param code - Team code to validate
 * @returns boolean - Whether the code format is valid
 */
export const validate_team_code_format = (code: string): boolean => {
  const code_regex = /^[A-Z0-9]{6}$/;
  return code_regex.test(code);
};

/**
 * Checks if a team code exists
 * @param code - Team code to check
 * @returns Promise<boolean> - Whether the code exists
 */
export const team_code_exists = async (code: string): Promise<boolean> => {
  const team = await Team.findOne({ code: code.toUpperCase() });
  return !!team;
};

/**
 * Gets team information by code
 * @param code - Team code
 * @returns Promise<any> - Team information or null
 */
export const get_team_by_code = async (code: string) => {
  return await Team.findOne({ code: code.toUpperCase() });
};

/**
 * Checks if user is team admin
 * @param team_id - Team ID
 * @param user_uid - User UID
 * @returns Promise<boolean> - Whether user is admin
 */
export const is_team_admin = async (team_id: string, user_uid: string): Promise<boolean> => {
  const team = await Team.findById(team_id);
  return team?.admin === user_uid;
};

/**
 * Checks if user is team member
 * @param team_id - Team ID
 * @param user_uid - User UID
 * @returns Promise<boolean> - Whether user is member
 */
export const is_team_member = async (team_id: string, user_uid: string): Promise<boolean> => {
  const team = await Team.findById(team_id);
  return team?.members.includes(user_uid) || false;
};
