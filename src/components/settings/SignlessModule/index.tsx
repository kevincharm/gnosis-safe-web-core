import { Paper, Grid, Typography, Box } from '@mui/material'

const SignlessModule = () => {
  return (
    <Paper sx={{ padding: 4 }}>
      <Grid container direction="row" justifyContent="space-between" spacing={3} mb={2}>
        <Grid item lg={4} xs={12}>
          <Typography variant="h4" fontWeight={700}>
            Spending limits
          </Typography>
        </Grid>

        <Grid item xs>
          <Box>
            <Typography>
              You can set rules for specific beneficiaries to access funds from this Safe without having to collect all
              signatures.
            </Typography>
          </Box>
        </Grid>
      </Grid>
    </Paper>
  )
}

export default SignlessModule
