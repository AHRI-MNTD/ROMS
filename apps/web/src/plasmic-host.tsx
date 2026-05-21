import * as React from 'react';
import { PlasmicCanvasHost, registerComponent } from '@plasmicapp/react-web/lib/host';

// Register your ROMS components here so they appear in Plasmic Studio
export default function PlasmicHost() {
  return <PlasmicCanvasHost />;
}