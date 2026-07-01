# Activity Admin Commands

Glizzanator tracks voice and stream time automatically while the bot is online. If the bot was offline or you need to correct totals, use the `/activity` admin command instead of editing the database manually.

Only members with **Manage Server** or **Administrator** can use these commands.

## View totals

```text
/activity view member:@Member
```

Shows:

- tracked voice hours
- manual voice adjustment
- displayed voice total
- tracked stream hours
- manual stream adjustment
- displayed stream total

## Add missing hours

```text
/activity addvoice member:@Member hours:5 reason:Bot was offline
/activity addstream member:@Member hours:2.5 reason:Stream missed during outage
```

Use this when the bot missed tracking time.

## Remove hours

```text
/activity removevoice member:@Member hours:1 reason:Correction
/activity removestream member:@Member hours:0.5 reason:Correction
```

This subtracts from the manual adjustment only. It does not delete real tracked sessions.

## Set displayed totals

```text
/activity setvoice member:@Member hours:250 reason:Syncing historical total
/activity setstream member:@Member hours:80 reason:Syncing historical total
```

This is the easiest way to make the card match the number you want. The bot calculates the needed manual adjustment behind the scenes.

Example: if someone has 230 tracked voice hours and you run `/activity setvoice hours:250`, the bot stores a +20 hour manual adjustment.

## Reset manual adjustments

```text
/activity reset member:@Member type:voice reason:Undo correction
/activity reset member:@Member type:stream reason:Undo correction
```

This resets manual adjustments to 0 for that activity type. Real tracked sessions remain untouched.

## View history

```text
/activity history member:@Member
```

Shows the last 10 admin adjustments for the member.

## Card behavior

The server stats card uses:

```text
tracked database time + manual adjustment time
```

Top Voice Members now uses total voice time.
Top Streamer now uses total stream time, not only the last 30 days.
