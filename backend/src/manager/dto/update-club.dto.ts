import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateClubDto {
    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    paymentInfo?: string;

    @IsOptional()
    @Transform(({ value }) => value ? parseInt(value, 10) : null)
    @IsInt({ message: 'Founded year must be a valid integer' })
    @Min(1900, { message: 'Founded year must be 1900 or later' })
    @Max(new Date().getFullYear(), { message: 'Founded year cannot be in the future' })
    foundedYear?: number;
}
