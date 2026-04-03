#!/usr/bin/env python3
"""
Career Plan Generator - Job Search Assistant
Generates a personalized career development plan using Claude AI.
"""

import anthropic
import json
import sys
from datetime import datetime


def get_user_profile() -> dict:
    """Collect user's career information interactively."""
    print("\n=== Career Plan Generator ===\n")
    print("Let's create your personalized career development plan.\n")

    profile = {}

    profile["current_role"] = input("Current role/title (or 'Student' if applicable): ").strip()
    profile["years_experience"] = input("Years of experience in your field: ").strip()
    profile["target_role"] = input("Target role/title you're aiming for: ").strip()
    profile["skills"] = input("Current skills (comma-separated): ").strip()
    profile["education"] = input("Highest education level: ").strip()
    profile["timeline"] = input("Timeline to achieve target role (e.g., '6 months', '1 year'): ").strip()
    profile["industry"] = input("Target industry: ").strip()

    return profile


def generate_career_plan(profile: dict) -> str:
    """Use Claude API to generate a personalized career plan."""
    client = anthropic.Anthropic()

    prompt = f"""You are a career coach helping someone create a detailed, actionable career development plan.

Here is the person's profile:
- Current Role: {profile['current_role']}
- Years of Experience: {profile['years_experience']}
- Target Role: {profile['target_role']}
- Current Skills: {profile['skills']}
- Education: {profile['education']}
- Timeline: {profile['timeline']}
- Target Industry: {profile['industry']}

Please create a comprehensive career plan that includes:

1. **Skills Gap Analysis** - What skills they need to develop
2. **Learning Roadmap** - Specific courses, certifications, or resources to acquire those skills (with estimated time)
3. **Networking Strategy** - How to build the right professional network
4. **Job Search Strategy** - Resume tips, portfolio suggestions, and job platforms to target
5. **Monthly Milestones** - Concrete monthly goals for the next 3-6 months
6. **Quick Wins** - 3 things they can do this week to get started

Make the plan specific, actionable, and realistic for their timeline."""

    print("\nGenerating your personalized career plan...\n")

    message = client.messages.create(
        model="claude-opus-4-6",
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    return message.content[0].text


def save_plan(profile: dict, plan: str) -> str:
    """Save the career plan to a markdown file."""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"career_plan_{timestamp}.md"

    content = f"""# Career Development Plan
Generated: {datetime.now().strftime("%B %d, %Y")}

## Your Profile
- **Current Role:** {profile['current_role']}
- **Target Role:** {profile['target_role']}
- **Timeline:** {profile['timeline']}
- **Target Industry:** {profile['industry']}

---

{plan}
"""

    with open(filename, "w") as f:
        f.write(content)

    return filename


def main():
    try:
        profile = get_user_profile()
        plan = generate_career_plan(profile)

        print("=" * 60)
        print(plan)
        print("=" * 60)

        save_choice = input("\nSave this plan to a file? (y/n): ").strip().lower()
        if save_choice == "y":
            filename = save_plan(profile, plan)
            print(f"\nPlan saved to: {filename}")

        print("\nGood luck on your career journey!")

    except KeyboardInterrupt:
        print("\n\nExiting career planner.")
        sys.exit(0)
    except anthropic.APIError as e:
        print(f"\nError calling Claude API: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
