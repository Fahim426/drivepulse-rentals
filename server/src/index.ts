import app from './app';
import { config } from './config';

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 DrivePulse Rental Management Server running at http://localhost:${PORT}`);
  console.log(`📁 Local uploads configured at: ${config.upload.dir}`);
});
