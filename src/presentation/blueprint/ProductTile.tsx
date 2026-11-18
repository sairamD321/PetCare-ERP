import { Box, Card, Center, Group, Stack } from '@mantine/core';
import { IconStarFilled } from '@/presentation/components/icons';
import type { ReactNode } from 'react';
import {
  displayValue,
  formatCell,
  isPriceField,
  productMeta,
  type BlueprintRecord,
  type GridColumn,
} from '@/domain/blueprint/dataTable';
import classes from './ProductTile.module.css';

interface ProductTileProps {
  record: BlueprintRecord;
  columns: GridColumn[];
  titleField: string | null;
  imageField: string | null;
  image: ReactNode;
  actions: ReactNode;
}

// One product on a blueprint product grid: image, two-line name, pack size and rating, then price and
// the remaining columns (stock …), with row actions at the bottom.
export function ProductTile({ record, columns, titleField, imageField, image, actions }: ProductTileProps) {
  const { unit, rating, ratingCount } = productMeta(record);
  const rest = columns.filter((c) => c.field !== imageField && c.field !== titleField);
  const prices = rest.filter(isPriceField);
  const details = rest.filter((c) => !isPriceField(c));
  const name = titleField ? displayValue(record[titleField]) : '';

  return (
    <Card padding="sm" className={classes.tile}>
      <Stack gap="sm" h="100%">
        {imageField && (
          <Center h={140} bg="gray.0" style={{ borderRadius: 'var(--mantine-radius-md)' }}>
            {image}
          </Center>
        )}

        <div className={classes.info}>
          {titleField && <h3 className={classes.name} title={name}>{name}</h3>}
          {(unit || rating) && (
            <div className={classes.meta}>
              {unit && <span className={classes.unit}>{unit}</span>}
              {unit && rating && <span className={classes.divider} aria-hidden="true">|</span>}
              {rating && (
                <span className={classes.rating} aria-label={`Rated ${rating}${ratingCount ? ` by ${ratingCount}` : ''}`}>
                  <IconStarFilled size={12} className={classes.star} aria-hidden="true" />
                  {rating.toFixed(1)}
                  {ratingCount && <span className={classes.count}>({ratingCount})</span>}
                </span>
              )}
            </div>
          )}
          {prices.map((c) => (
            <div key={c.field} className={classes.price}>{formatCell(c, record[c.field])}</div>
          ))}
        </div>

        {details.map((c) => (
          <Group key={c.field} justify="space-between" gap="xs" wrap="nowrap" className={classes.detail}>
            <span className={classes.detailLabel}>{c.displayName ?? c.field}</span>
            <span className={classes.detailValue}>{formatCell(c, record[c.field])}</span>
          </Group>
        ))}

        {/* Row actions sit at the bottom right. */}
        {actions && <Box mt="auto">{actions}</Box>}
      </Stack>
    </Card>
  );
}
